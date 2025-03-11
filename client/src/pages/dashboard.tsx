import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, DollarSign, Calendar, Bell, MessageSquare, List } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TaskManager from "@/components/tasks/TaskManager";
import type { Appointment } from "@shared/schema";

// Stats Overview Component
function StatsOverview() {
  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const stats = {
    today: appointments?.filter(a => 
      new Date(a.datetime).toDateString() === new Date().toDateString()
    ).length || 0,
    pending: appointments?.filter(a => a.status === "pending").length || 0,
    revenue: appointments?.reduce((sum, a) => 
      a.paymentStatus === "paid" ? sum + 50 : sum, 0
    ) || 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
          <div className="text-2xl font-bold">{stats.today}</div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <div className="text-2xl font-bold">${stats.revenue}</div>
        </CardHeader>
      </Card>
    </div>
  );
}

function AppointmentList({ filter }: { filter: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/appointments/${id}`,
        { status }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment status",
        variant: "destructive",
      });
    },
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
  }) || [];

  const handleMarkComplete = async (appointmentId: number) => {
    await updateAppointment.mutateAsync({
      id: appointmentId,
      status: "completed"
    });
  };

  const handleSendWhatsApp = (phoneNumber: string, appointmentDate: string) => {
    // Format the WhatsApp message
    const message = `Hello! This is a reminder for your spiritual consultation scheduled for ${formatDateTime(appointmentDate)}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAddReminder = (appointment: Appointment) => {
    // TODO: Implement add reminder functionality
    toast({
      title: "Coming Soon",
      description: "Reminder functionality will be available soon",
    });
  };

  return (
    <div className="space-y-4">
      {filteredAppointments.length > 0 ? (
        filteredAppointments.map((appointment) => (
          <Card key={appointment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">{appointment.type}</h3>
                  <p className="text-sm text-muted-foreground">
                    Scheduled for: {formatDateTime(appointment.datetime)}
                  </p>
                  {appointment.consultationDetails?.description && (
                    <p className="text-sm text-muted-foreground max-w-md">
                      Client's Request: {appointment.consultationDetails.description}
                    </p>
                  )}
                  <p className="text-sm">
                    Contact: {appointment.phoneNumber}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      appointment.status === "completed" 
                        ? "default"
                        : appointment.status === "confirmed"
                        ? "secondary"
                        : "outline"
                    }>
                      {appointment.status}
                    </Badge>
                    <Badge variant={
                      appointment.paymentStatus === "paid" 
                        ? "default"
                        : "destructive"
                    }>
                      {appointment.paymentStatus}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendWhatsApp(appointment.phoneNumber, appointment.datetime)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddReminder(appointment)}
                    >
                      <Bell className="w-4 h-4 mr-1" />
                      Remind
                    </Button>
                    {appointment.paymentStatus === "paid" && appointment.status !== "completed" && (
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(appointment.id)}
                        disabled={updateAppointment.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No {filter} consultations found
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        </div>

        <StatsOverview />

        <div className="grid md:grid-cols-2 gap-6">
          <TaskManager />

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Bulk Messages
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="w-4 h-4 mr-2" />
                View Payment Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl">Consultation Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
                <TabsTrigger 
                  value="pending" 
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pending Requests
                </TabsTrigger>
                <TabsTrigger 
                  value="paid"
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Paid Consultations
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Completed Sessions
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="pending">
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-muted-foreground">New consultation requests awaiting your review</h2>
                  </div>
                  <AppointmentList filter="pending" />
                </TabsContent>
                <TabsContent value="paid">
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-muted-foreground">Consultations ready to be conducted</h2>
                  </div>
                  <AppointmentList filter="paid" />
                </TabsContent>
                <TabsContent value="completed">
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-muted-foreground">History of completed consultations</h2>
                  </div>
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