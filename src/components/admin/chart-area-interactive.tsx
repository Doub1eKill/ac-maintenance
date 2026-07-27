"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"

export const description = "An interactive bar chart"

const defaultChartData = [
  { date: "2026-05-01", desktop: 12, mobile: 18 },
  { date: "2026-05-05", desktop: 18, mobile: 24 },
  { date: "2026-05-10", desktop: 25, mobile: 20 },
  { date: "2026-05-15", desktop: 30, mobile: 28 },
  { date: "2026-05-20", desktop: 22, mobile: 35 },
  { date: "2026-05-25", desktop: 38, mobile: 30 },
  { date: "2026-05-30", desktop: 45, mobile: 40 },
  { date: "2026-06-05", desktop: 28, mobile: 32 },
  { date: "2026-06-10", desktop: 34, mobile: 26 },
  { date: "2026-06-15", desktop: 42, mobile: 38 },
  { date: "2026-06-20", desktop: 50, mobile: 44 },
  { date: "2026-06-25", desktop: 39, mobile: 48 },
  { date: "2026-06-30", desktop: 55, mobile: 52 },
  { date: "2026-07-05", desktop: 41, mobile: 36 },
  { date: "2026-07-10", desktop: 48, mobile: 42 },
  { date: "2026-07-15", desktop: 58, mobile: 50 },
  { date: "2026-07-20", desktop: 64, mobile: 56 },
  { date: "2026-07-25", desktop: 72, mobile: 65 },
  { date: "2026-07-27", desktop: 68, mobile: 60 },
]

const chartConfig = {
  visitors: {
    label: "จำนวนงาน",
  },
  desktop: {
    label: "งานแจ้งซ่อมบำรุง",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "งานซ่อมเสร็จสิ้น",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  data?: Array<{ date: string; desktop: number; mobile: number }>;
  title?: string;
  description?: string;
}

export function ChartAreaInteractive({
  data = defaultChartData,
  title = "Bar Chart - Interactive",
  description: chartDesc = "แสดงสถิติการแจ้งซ่อมและการดำเนินงานย้อนหลัง",
}: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return defaultChartData;
    
    // Find latest date in dataset or use today
    const latestTimestamp = Math.max(...data.map(d => new Date(d.date).getTime()));
    const referenceDate = isNaN(latestTimestamp) ? new Date() : new Date(latestTimestamp);
    
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    return data.filter((item) => {
      const date = new Date(item.date)
      return date >= startDate
    })
  }, [data, timeRange]);

  return (
    <Card className="pt-0 border-border bg-card">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-border py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-base font-bold">{title}</CardTitle>
          <CardDescription className="text-xs">
            {chartDesc}
          </CardDescription>
        </div>
        <div className="w-[180px] shrink-0 sm:w-[200px] sm:ml-auto">
          <NativeSelect
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full"
            aria-label="Select a value"
          >
            <NativeSelectOption value="90d">3 เดือนล่าสุด (90 วัน)</NativeSelectOption>
            <NativeSelectOption value="30d">30 วันล่าสุด</NativeSelectOption>
            <NativeSelectOption value="7d">7 วันล่าสุด</NativeSelectOption>
          </NativeSelect>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart accessibilityLayer data={filteredData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("th-TH", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Bar
              dataKey="desktop"
              stackId="a"
              fill="var(--color-desktop)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="mobile"
              stackId="a"
              fill="var(--color-mobile)"
              radius={[4, 4, 0, 0]}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
