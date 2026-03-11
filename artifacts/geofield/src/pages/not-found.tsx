import { Card, CardContent } from "@/components/ui/card";
import { Map, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center shadow-xl border-border/50">
        <CardContent className="pt-6 pb-2">
          <div className="flex mb-6 justify-center">
            <div className="p-4 bg-muted rounded-full">
              <Map className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 font-display">Lost in the field?</h1>
          <p className="text-sm text-muted-foreground mb-8">
            The coordinates you provided don't match any known locations in our database.
          </p>
          <Button asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Basecamp
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
