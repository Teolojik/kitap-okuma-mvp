import React, { useEffect, useRef, useState } from 'react';

interface PageDrawingOverlayProps {
    active: boolean;
    tool: 'pen' | 'marker' | 'eraser';
    pageKey: string;
    savedData?: string;
    onSave: (data: string) => void;
    settings: {
        color: string;
        width: number;
        opacity: number;
    };
}

type DrawingPoint = [number, number];

interface DrawingStroke {
    tool: 'pen' | 'marker' | 'eraser';
    color: string;
    width: number;
    opacity: number;
    points: DrawingPoint[];
}

interface DrawingPayloadV2 {
    version: 2;
    baseWidth: number;
    baseHeight: number;
    backgroundDataUrl?: string;
    strokes: DrawingStroke[];
}

const createEmptyPayload = (width = 1, height = 1): DrawingPayloadV2 => ({
    version: 2,
    baseWidth: Math.max(1, Math.floor(width)),
    baseHeight: Math.max(1, Math.floor(height)),
    strokes: [],
});

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toNormalizedPoint = (x: number, y: number, canvas: HTMLCanvasElement): DrawingPoint => [
    clamp01(canvas.width > 0 ? x / canvas.width : 0),
    clamp01(canvas.height > 0 ? y / canvas.height : 0),
];

const toPixelPoint = (point: DrawingPoint, canvas: HTMLCanvasElement) => ({
    x: point[0] * canvas.width,
    y: point[1] * canvas.height,
});

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const sanitizeStroke = (raw: any): DrawingStroke | null => {
    if (!raw || !Array.isArray(raw.points) || raw.points.length === 0) return null;

    const tool = raw.tool === 'marker' || raw.tool === 'eraser' ? raw.tool : 'pen';
    const color = typeof raw.color === 'string' ? raw.color : '#f97316';
    const width = isFiniteNumber(raw.width) ? Math.max(1, raw.width) : 3;
    const opacity = isFiniteNumber(raw.opacity) ? Math.max(0.05, Math.min(1, raw.opacity)) : 1;

    const points: DrawingPoint[] = raw.points
        .map((point: unknown) => {
            if (!Array.isArray(point) || point.length < 2) return null;
            const x = Number(point[0]);
            const y = Number(point[1]);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return [clamp01(x), clamp01(y)] as DrawingPoint;
        })
        .filter((point: DrawingPoint | null): point is DrawingPoint => point !== null);

    if (points.length === 0) return null;

    return { tool, color, width, opacity, points };
};

const parseSavedDrawing = (savedData?: string, width = 1, height = 1): DrawingPayloadV2 => {
    if (!savedData) return createEmptyPayload(width, height);

    if (savedData.startsWith('data:')) {
        return {
            ...createEmptyPayload(width, height),
            backgroundDataUrl: savedData,
        };
    }

    if (!savedData.trim().startsWith('{')) {
        return createEmptyPayload(width, height);
    }

    try {
        const parsed = JSON.parse(savedData);
        const version = Number(parsed?.version);
        const strokes = Array.isArray(parsed?.strokes) ? parsed.strokes : [];

        if (version === 2) {
            const sanitizedStrokes = strokes
                .map((stroke: unknown) => sanitizeStroke(stroke))
                .filter((stroke: DrawingStroke | null): stroke is DrawingStroke => stroke !== null);

            return {
                version: 2,
                baseWidth: isFiniteNumber(parsed?.baseWidth) ? Math.max(1, Math.floor(parsed.baseWidth)) : Math.max(1, Math.floor(width)),
                baseHeight: isFiniteNumber(parsed?.baseHeight) ? Math.max(1, Math.floor(parsed.baseHeight)) : Math.max(1, Math.floor(height)),
                backgroundDataUrl: typeof parsed?.backgroundDataUrl === 'string' ? parsed.backgroundDataUrl : undefined,
                strokes: sanitizedStrokes,
            };
        }

        if (typeof parsed?.dataUrl === 'string' && parsed.dataUrl.startsWith('data:')) {
            return {
                ...createEmptyPayload(width, height),
                backgroundDataUrl: parsed.dataUrl,
            };
        }
    } catch {
        return createEmptyPayload(width, height);
    }

    return createEmptyPayload(width, height);
};

const applyToolStyle = (
    ctx: CanvasRenderingContext2D,
    tool: 'pen' | 'marker' | 'eraser',
    color: string,
    width: number,
    opacity: number
) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen') {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'source-over';
        return;
    }

    if (tool === 'marker') {
        ctx.strokeStyle = color;
        ctx.lineWidth = width * 6;
        ctx.globalAlpha = Math.min(opacity, 0.4);
        ctx.globalCompositeOperation = 'source-over';
        return;
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = width * 8;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
};

export default function PageDrawingOverlay({
    active,
    tool,
    pageKey,
    savedData,
    onSave,
    settings
}: PageDrawingOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const loadedPageKeyRef = useRef<string | null>(null);
    const payloadRef = useRef<DrawingPayloadV2>(createEmptyPayload());
    const activeStrokeRef = useRef<DrawingStroke | null>(null);
    const renderTokenRef = useRef(0);
    const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const [isDrawing, setIsDrawing] = useState(false);

    const drawPayloadToCanvas = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const payload = payloadRef.current;
        const token = ++renderTokenRef.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (payload.backgroundDataUrl) {
            let image = imageCacheRef.current.get(payload.backgroundDataUrl);
            if (!image) {
                image = new Image();
                image.src = payload.backgroundDataUrl;
                imageCacheRef.current.set(payload.backgroundDataUrl, image);
            }

            if (!image.complete) {
                await new Promise<void>((resolve) => {
                    image!.onload = () => resolve();
                    image!.onerror = () => resolve();
                });
            }

            if (token !== renderTokenRef.current) return;

            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            }
        }

        const scaleX = canvas.width / Math.max(1, payload.baseWidth);
        const scaleY = canvas.height / Math.max(1, payload.baseHeight);
        const widthScale = (scaleX + scaleY) / 2;

        for (const stroke of payload.strokes) {
            if (!stroke.points.length) continue;

            applyToolStyle(
                ctx,
                stroke.tool,
                stroke.color,
                stroke.width * widthScale,
                stroke.opacity
            );

            const firstPoint = toPixelPoint(stroke.points[0], canvas);

            if (stroke.points.length === 1) {
                ctx.beginPath();
                ctx.arc(firstPoint.x, firstPoint.y, Math.max(1, ctx.lineWidth * 0.5), 0, Math.PI * 2);
                ctx.fillStyle = stroke.tool === 'eraser' ? '#000000' : stroke.color;
                ctx.globalAlpha = stroke.tool === 'marker' ? Math.min(stroke.opacity, 0.4) : stroke.opacity;
                if (stroke.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
                ctx.fill();
                continue;
            }

            ctx.beginPath();
            ctx.moveTo(firstPoint.x, firstPoint.y);

            for (let i = 1; i < stroke.points.length; i += 1) {
                const point = toPixelPoint(stroke.points[i], canvas);
                ctx.lineTo(point.x, point.y);
            }

            ctx.stroke();
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const syncSize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const width = Math.max(1, Math.floor(parent.clientWidth));
            const height = Math.max(1, Math.floor(parent.clientHeight));

            if (canvas.width === width && canvas.height === height) return;

            canvas.width = width;
            canvas.height = height;

            void drawPayloadToCanvas();
        };

        syncSize();

        const resizeObserver = new ResizeObserver(() => {
            syncSize();
        });

        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (loadedPageKeyRef.current === pageKey && savedData === undefined) return;

        loadedPageKeyRef.current = pageKey;
        payloadRef.current = parseSavedDrawing(savedData, canvas.width, canvas.height);
        if (!payloadRef.current.baseWidth || !payloadRef.current.baseHeight) {
            payloadRef.current.baseWidth = Math.max(1, canvas.width);
            payloadRef.current.baseHeight = Math.max(1, canvas.height);
        }
        void drawPayloadToCanvas();
    }, [pageKey, savedData]);

    const getPoint = (event: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        if (!active) return;
        if ('touches' in event) {
            if (event.touches.length !== 1) return;
            event.preventDefault();
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const startPoint = getPoint(event, canvas);
        lastPosRef.current = startPoint;

        if (!payloadRef.current.baseWidth || !payloadRef.current.baseHeight) {
            payloadRef.current.baseWidth = Math.max(1, canvas.width);
            payloadRef.current.baseHeight = Math.max(1, canvas.height);
        }

        const stroke: DrawingStroke = {
            tool,
            color: settings.color,
            width: settings.width,
            opacity: settings.opacity,
            points: [toNormalizedPoint(startPoint.x, startPoint.y, canvas)],
        };

        payloadRef.current.strokes.push(stroke);
        activeStrokeRef.current = stroke;
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!active || !isDrawing || !lastPosRef.current) return;
        if ('touches' in event) {
            if (event.touches.length !== 1) return;
            event.preventDefault();
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const nextPoint = getPoint(event, canvas);

        applyToolStyle(ctx, tool, settings.color, settings.width, settings.opacity);
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();

        if (activeStrokeRef.current) {
            activeStrokeRef.current.points.push(toNormalizedPoint(nextPoint.x, nextPoint.y, canvas));
        }

        lastPosRef.current = nextPoint;
    };

    const stopDrawing = () => {
        if (!isDrawing) return;

        setIsDrawing(false);
        lastPosRef.current = null;
        activeStrokeRef.current = null;

        onSave(JSON.stringify(payloadRef.current));
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 touch-none ${active ? 'z-[120] pointer-events-auto cursor-crosshair' : 'z-[12] pointer-events-none'}`}
            style={{
                mixBlendMode: 'multiply',
                opacity: 1
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
        />
    );
}
