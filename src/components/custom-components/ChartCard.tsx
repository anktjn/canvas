'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type ChartType = 'bar' | 'line' | 'pie';

interface ChartCardProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
  type: ChartType;
  xAxisKey?: string;
  seriesKeys: string[]; // keys to plot (y-axis)
  colors?: string[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

export function ChartCard({
  title,
  description,
  data,
  type,
  xAxisKey,
  seriesKeys,
  colors = COLORS,
}: ChartCardProps) {
  const safeData = Array.isArray(data) ? data : [];
  const safeSeries = Array.isArray(seriesKeys) ? seriesKeys : [];
  const safeColors = Array.isArray(colors) ? colors : COLORS;

  const renderPlaceholder = (message: string) => (
    <Card className="w-full h-full min-h-[350px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );

  if (safeData.length === 0) {
    return renderPlaceholder('No data available for chart');
  }

  if (safeSeries.length === 0) {
    return renderPlaceholder('Chart configuration missing: at least one series key is required.');
  }

  if (!xAxisKey) {
    const label = type === 'pie' ? 'segment name key' : 'x-axis key';
    return renderPlaceholder(`Chart configuration missing: ${label} is required.`);
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={safeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {safeSeries.map((key, index) => (
              <Bar key={key} dataKey={key} fill={safeColors[index % safeColors.length]} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={safeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {safeSeries.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={safeColors[index % safeColors.length]}
              />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={safeSeries[0]}
              nameKey={xAxisKey}
            >
              {safeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={safeColors[index % safeColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Unsupported chart type
          </div>
        );
    }
  };

  return (
    <Card className="w-full h-full min-h-[350px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

