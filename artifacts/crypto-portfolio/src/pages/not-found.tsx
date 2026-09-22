import { useEffect } from "react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <span className="font-display text-4xl text-muted-foreground">?</span>
      </div>
      <h1 className="text-4xl font-display mb-2">404 - Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
        Return to Command Center
      </Link>
    </div>
  );
}