"use client";

import PageHeader from "@/components/common/PageHeader";
import ContributionForm from "@/components/contributions/ContributionForm";
import ContributionList from "@/components/contributions/ContributionList";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ContributionsPage() {
  return (
    <>
      <PageHeader
        title="Contributions"
        description="Manage your contributions and view your payment history."
      />
       <Tabs defaultValue="make-contribution" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="make-contribution">Make Contribution</TabsTrigger>
          <TabsTrigger value="my-contributions">My Contributions</TabsTrigger>
        </TabsList>
        <TabsContent value="make-contribution" className="mt-6">
          <ContributionForm />
        </TabsContent>
        <TabsContent value="my-contributions" className="mt-6">
          <ContributionList />
        </TabsContent>
      </Tabs>
    </>
  );
}
