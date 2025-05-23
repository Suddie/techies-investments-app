"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart" // Assuming ChartTooltip is also exported or use Recharts' Tooltip
import type { ChartConfig } from "@/components/ui/chart"

const chartData = [ // Mock data
  { month: "January", completed: 10, target: 100 },
  { month: "February", completed: 25, target: 100 },
  { month: "March", completed: 45, target: 100 },
  { month: "April", completed: 60, target: 100 },
  { month: "May", completed: 75, target: 100 },
  { month: "June", completed: 90, target: 100 },
]

const chartConfig = {
  completed: {
    label: "Completed (%)",
    color: "hsl(var(--primary))",
  },
  target: {
    label: "Target (%)",
    color: "hsl(var(--muted))",
  }
} satisfies ChartConfig

interface ProjectCompletionChartProps {
    percentage: number; // 0-100
}

export default function ProjectCompletionChart({ percentage }: ProjectCompletionChartProps) {
  const data = [{ name: "Progress", value: percentage, fill: "hsl(var(--primary))" }, { name: "Remaining", value: 100 - percentage, fill: "hsl(var(--muted))" }];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Completion</CardTitle>
        <CardDescription>Shopping Mall Construction Progress</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} stackOffset="expand">
                <CartesianGrid horizontal={false} vertical={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={[5,5,5,5]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Currently {percentage}% complete <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          {100 - percentage}% remaining to completion.
        </div>
      </CardFooter>
    </Card>
  )
}

// Fallback for ChartTooltipContent if not directly available. This is a simplified version.
// const CustomTooltip = ({ active, payload, label }: any) => {
//   if (active && payload && payload.length) {
//     return (
//       <div className="p-2 border rounded shadow-lg bg-background text-foreground">
//         <p className="label">{`${payload[0].name} : ${payload[0].value}%`}</p>
//       </div>
//     );
//   }
//   return null;
// };
