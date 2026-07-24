"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useVerifyCredentialsMutation, useLoginMutation } from "@/store/slices/authSlice/api.auth";

export default function Auth() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [user_id, setUserid] = useState("");
  const [password, setPassword] = useState("");

  const [verifyCredentials, { isLoading: isSignUpLoading }] = useVerifyCredentialsMutation();
  const [login, { isLoading: isSignInLoading }] = useLoginMutation();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyCredentials({ user_id, password }).unwrap();
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.data?.error || "Sign in failed",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password }).unwrap();
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.data?.error || "Sign in failed",
      });
    }
  };

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
                  {isSignUpLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
