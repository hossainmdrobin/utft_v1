"use client";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/mongodb/client";
import { Search, Users } from "lucide-react";

interface MemberDirectory {
  id: string;
  beneficiary_id: string | null;
  full_name: string;
  member_type: "founding" | "general";
  status: string;
  share_quantity: number;
  photo_url: string | null;
  approved_at: string | null;
}

export default function MemberDirectory() {
  const [members, setMembers] = useState<MemberDirectory[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberDirectory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = members.filter((member) =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.beneficiary_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("member_directory")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error) {
      console.error("Error fetching member directory:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Member Directory</h1>
          <p className="text-muted-foreground mt-2">
            Browse active members in the trust
          </p>
        </div>

        <Card className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or User ID..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No members found matching your search" : "No active members found"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.photo_url || undefined} />
                      <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {member.full_name}
                      </h3>
                      {member.beneficiary_id && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {member.beneficiary_id}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={member.member_type === "founding" ? "default" : "secondary"}>
                          {member.member_type === "founding" ? "Founding" : "General"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {member.share_quantity} shares
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <div className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} active members
        </div>
      </div>
    </DashboardLayout>
  );
}

