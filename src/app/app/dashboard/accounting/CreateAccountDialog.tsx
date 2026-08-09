"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/mongodb/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateAccountFormFields, accountSchema, type AccountFormValues } from "./CreateAccountFormFields";
import { useCreateAccountMutation } from "@/store/slices/accountSlice/api.account";

interface CreateAccountDialogProps {
  trigger?: React.ReactNode;
}

export function CreateAccountDialog({ trigger }: CreateAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [createNewAccount, { data: accountData, isLoading, error }] = useCreateAccountMutation();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      account_type: "asset",
      parent_id: "",
      parent_account_id: "",
      description: "",
      opening_balance: 0,
      is_contra: false,
    },
  });


  useEffect(() => {
    if (accountData) {
      form.reset()
      setOpen(false)
      toast.success("Account created successfully");
    }
    if (error) {
      toast.error("Could not create account.")
    }
  }, [])

  // const mainAccounts = parentAccounts?.filter((acc) => !acc.is_contra);
  const mainAccounts = []

  const createAccount = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("accounts").insert({
        code: values.code,
        name: values.name,
        account_type: values.account_type,
        parent_id: values.parent_id || null,
        parent_account_id: values.is_contra ? (values.parent_account_id || null) : null,
        description: values.description || null,
        opening_balance: values.opening_balance,
        current_balance: values.opening_balance,
        is_contra: values.is_contra,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-parents"] });
      toast.success("Account created successfully");
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create account");
    },
  });

  const selectedType = form.watch("account_type");

  const filteredParents = [].filter(
    (acc) => acc.account_type === selectedType && !acc.is_contra
  );

  const filteredMainAccounts = mainAccounts?.filter(
    (acc) => acc.account_type === selectedType
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
        </DialogHeader>
        <CreateAccountFormFields
          form={form}
          // parentAccounts={parentAccounts}
          mainAccounts={mainAccounts}
          filteredParents={filteredParents}
          filteredMainAccounts={filteredMainAccounts}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createAccount.isPending}
            onClick={form.handleSubmit((v) => {
              createNewAccount(v)
            })}
          >
            {isLoading ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
