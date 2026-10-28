"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
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
        type: "asset",
        parentAccount: "",
        description: "",
      },
  });

  useEffect(() => {
    if (accountData) {
      form.reset();
      setOpen(false);
      toast.success("Account created successfully");
    }
    if (error) {
      toast.error("Could not create account.");
    }
  }, []);

  const createAccount = (values: AccountFormValues) => {
    return createNewAccount(values);
  };

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
        <CreateAccountFormFields form={form} />
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createNewAccount.isPending}
            onClick={form.handleSubmit((v) => {
              createAccount(v);
            })}
          >
            {isLoading ? "Creating..." : "Create Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
