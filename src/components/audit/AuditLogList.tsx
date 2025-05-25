
"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from '@/lib/types';
import { useFirebase } from '@/contexts/FirebaseProvider';
import { collection, query, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area'; // For potentially long lists
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ITEMS_PER_PAGE = 25; // Or any other reasonable number

export default function AuditLogList() {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const auditLogRef = collection(db, "auditLog");
    // Order by timestamp descending and limit the initial load
    const q = query(auditLogRef, orderBy("timestamp", "desc"), limit(ITEMS_PER_PAGE));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedLogs: AuditLogEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
        
        fetchedLogs.push({ 
            id: doc.id, 
            ...data,
            timestamp,
         } as AuditLogEntry);
      });
      setAuditLogs(fetchedLogs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching audit logs:", err);
      setError("Failed to load audit logs. Please try again later. This could be due to missing Firestore permissions or an incorrect collection name ('auditLog').");
      toast({
        title: "Error Fetching Audit Logs",
        description: `Could not load audit logs: ${err.message}. Ensure the 'auditLog' collection exists and has correct read permissions.`,
        variant: "destructive",
        duration: 10000,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Loading Audit Log...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Error Loading Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive">{error}</p>
            </CardContent>
        </Card>
    );
  }
  
  if (auditLogs.length === 0) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>No audit log entries found.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-8">
                    The audit log is currently empty. Significant actions will be recorded here.
                </p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Application Audit Log</CardTitle>
            <CardDescription>Displaying the latest {Math.min(auditLogs.length, ITEMS_PER_PAGE)} entries.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[600px]"> {/* Adjust height as needed */}
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[200px]">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action Type</TableHead>
                    <TableHead>Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                        <TableCell>{format(log.timestamp, "PPpp")}</TableCell>
                        <TableCell>{log.userName} ({log.userId.substring(0,8)}...)</TableCell>
                        <TableCell><Badge variant="outline">{log.actionType}</Badge></TableCell>
                        <TableCell className="text-xs">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
    </Card>
  );
}

```