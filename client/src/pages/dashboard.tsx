import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@shared/schema";

function AppointmentList() {
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

  return (
    <div className="space-y-4">
      {appointments?.map((appointment) => (
        <Card key={appointment.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{appointment.type}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(appointment.datetime)}
                </p>
              </div>
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentList />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
