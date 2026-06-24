import { useAuth } from "@workspace/replit-auth-web";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { User, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and settings.</p>
      </div>

      <Card className="bg-card/50 border-white/10 shadow-2xl backdrop-blur relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Your personal information is secure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-white/5">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-5xl font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              {(user?.firstName || user?.email || "U")[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email}</h2>
              <p className="text-muted-foreground flex items-center mt-1">
                <Mail className="w-4 h-4 mr-2" />
                {user?.email || "No email provided"}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center">
                <User className="w-4 h-4 mr-2" />
                Account ID
              </p>
              <p className="font-mono text-lg">{user?.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Member Since
              </p>
              <p className="text-lg">
                {user?.createdAt ? format(new Date(user.createdAt), "MMMM d, yyyy") : "Unknown"}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <Button variant="destructive" onClick={logout} className="w-full sm:w-auto">
              Sign Out Securely
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
