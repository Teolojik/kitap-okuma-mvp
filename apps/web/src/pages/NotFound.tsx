import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight">404</h1>
        <p className="text-muted-foreground">Aradiginiz sayfa bulunamadi.</p>
        <Button asChild>
          <Link to="/">Ana sayfaya don</Link>
        </Button>
      </div>
    </div>
  );
}

