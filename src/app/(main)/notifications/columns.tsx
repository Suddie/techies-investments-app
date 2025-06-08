"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type NotificationColumn = {
  id: string;
  recipientName: string;
  title: string;
  message: string;
  timestamp: Timestamp;
};

interface ColumnsProps {
  onDelete: (id: string) => void;
}

export const columns = ({ onDelete }: ColumnsProps): ColumnDef<NotificationColumn>[] => [
  {
    accessorKey: "recipientName",
    header: "Recipient",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const message = row.original.message;
      return <div className="truncate max-w-xs">{message}</div>;
    },
  },
  {
    accessorKey: "timestamp",
    header: "Date Sent",
    cell: ({ row }) => {
      const timestamp = row.getValue("timestamp") as Timestamp;
      return <div>{format(timestamp.toDate(), "MMM dd, yyyy 'at' hh:mm a")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const notification = row.original;

      return (
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                notification.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => onDelete(notification.id)}
              >
                Yes, delete it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];