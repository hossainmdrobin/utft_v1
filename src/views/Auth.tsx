"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useVerifyCredentialsMutation, useLoginMutation } from "@/store/slices/authSlice/api.auth";
import SignupForm from "@/app/auth/SignupForm";

export default function Auth() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [user_id, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [open,setOpen] = useState(false)

  const [verifyCredentials, { data: verifyData, isLoading: isSignUpLoading, error: verifiedError }] = useVerifyCredentialsMutation();
  const [login, { isLoading: isSignInLoading, error: signInError }] = useLoginMutation();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyCredentials({ user_id, password }).unwrap();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password }).unwrap();
  };

  useEffect(() => {
    if (verifiedError) {
      toast({
        title: "Error",
        description: verifiedError?.data?.error || "Verification failed",
      });
    }
    if (verifyData) {
      setOpen(true)
      toast({
        title: "Success",
        description: "Credentials verified successfully",
      });
    }
    if (signInError) {
      toast({
        title: "Error",
        description: signInError?.data?.error || "Login failed",
      });
    }
  }, [verifyData, verifiedError, signInError,])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <CardTitle className="text-2xl">Trust Management System</CardTitle>
          <CardDescription>Sign in to manage your trust members</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Email</Label>
                  <Input
                    id="user_id"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSignInLoading}>
                  {isSignInLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">User ID</Label>
                  <Input
                    id="signup-email"
                    type="text"
                    placeholder="User ID"
                    value={user_id}
                    onChange={(e) => setUserid(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSignUpLoading}>
                  {isSignUpLoading ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {open && <SignupForm id={user_id} open={open} onOpenChange={setOpen} onSuccess={() => { setOpen(false) }} />}
    </div>
  );
}
