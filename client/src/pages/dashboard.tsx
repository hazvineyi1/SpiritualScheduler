import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, Clock, DollarSign } from "lucide-react";
import type { Appointment } from "@shared/schema";

function AppointmentList({ filter }: { filter: string }) {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const filteredAppointments = appointments?.filter(appointment => {
    switch (filter) {
      case "pending":
        return appointment.status === "pending" && appointment.paymentStatus === "pending";
      case "paid":
        return appointment.paymentStatus === "paid" && appointment.status !== "completed";
      case "completed":
        return appointment.status === "completed";
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      {filteredAppointments?.map((appointment) => (
        <Card key={appointment.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="font-medium">{appointment.type}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(appointment.datetime)}
                </p>
                {appointment.consultationDetails?.description && (
                  <p className="text-sm text-muted-foreground max-w-md">
                    Details: {appointment.consultationDetails.description}
                  </p>
                )}
                <p className="text-sm">
                  Contact: {appointment.phoneNumber}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    appointment.status === "confirmed" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {appointment.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    appointment.paymentStatus === "paid" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {appointment.paymentStatus}
                  </span>
                </div>
                {appointment.paymentStatus === "paid" && appointment.status !== "completed" && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="mt-2"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>Consultation Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
                <TabsTrigger 
                  value="pending" 
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pending
                </TabsTrigger>
                <TabsTrigger 
                  value="paid"
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Paid
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Completed
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <TabsContent value="pending">
                  <AppointmentList filter="pending" />
                </TabsContent>
                <TabsContent value="paid">
                  <AppointmentList filter="paid" />
                </TabsContent>
                <TabsContent value="completed">
                  <AppointmentList filter="completed" />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}