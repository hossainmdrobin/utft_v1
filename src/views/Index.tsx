"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Users, DollarSign, FileText, Shield } from "lucide-react";

const Index = () => {
  const router = useRouter();

  const features = [
    {
      icon: Users,
      title: "Member Management",
      description: "Complete member registration, approval workflow, and beneficiary ID generation"
    },
    {
      icon: DollarSign,
      title: "Share System",
      description: "Automated share accounting with auto-journal entries and capital tracking"
    },
    {
      icon: FileText,
      title: "Accounting",
      description: "QuickBooks-style accounting with chart of accounts, ledgers, and reports"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Built with modern security practices and data protection"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-medium">
              <span className="text-white font-bold text-3xl">T</span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Trust Management
              <span className="block gradient-primary bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Complete member management and accounting software for your trust organization
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              size="lg" 
              className="gap-2 text-lg px-8 py-6 shadow-medium hover:shadow-lg transition-all"
              onClick={() => router.push("/auth")}
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 pt-12">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="bg-card border border-border rounded-xl p-6 text-left hover:shadow-medium transition-all shadow-soft"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
