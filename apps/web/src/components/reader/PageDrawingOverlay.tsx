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

const drawScaledImage = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dataUrl?: string
) => {
    if (!dataUrl) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
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
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const syncSize = (snapshot?: string) => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const width = Math.max(1, Math.floor(parent.clientWidth));
            const height = Math.max(1, Math.floor(parent.clientHeight));

            if (canvas.width === width && canvas.height === height) return;

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            drawScaledImage(ctx, canvas, snapshot);
        };

        syncSize(savedData);

        const resizeObserver = new ResizeObserver(() => {
            const snapshot = canvas.toDataURL();
            syncSize(snapshot);
        });

        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }

        return () => resizeObserver.disconnect();
    }, [savedData]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        if (loadedPageKeyRef.current === pageKey) return;

        loadedPageKeyRef.current = pageKey;
        drawScaledImage(ctx, canvas, savedData);
    }, [pageKey, savedData]);

    const setupContext = (ctx: CanvasRenderingContext2D) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'pen') {
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = settings.width;
            ctx.globalAlpha = settings.opacity;
            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        if (tool === 'marker') {
            ctx.strokeStyle = settings.color;
            ctx.lineWidth = settings.width * 6;
            ctx.globalAlpha = Math.min(settings.opacity, 0.4);
            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = settings.width * 8;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';
    };

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

        const canvas = canvasRef.current;
        if (!canvas) return;

        lastPosRef.current = getPoint(event, canvas);
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!active || !isDrawing || !lastPosRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const nextPoint = getPoint(event, canvas);

        setupContext(ctx);
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();

        lastPosRef.current = nextPoint;
    };

    const stopDrawing = () => {
        if (!isDrawing) return;

        setIsDrawing(false);
        lastPosRef.current = null;

        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL());
        }
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
        />
    );
}
