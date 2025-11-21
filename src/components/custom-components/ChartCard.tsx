'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AlertCircle } from 'lucide-react';

type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartCardProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
  type: ChartType;
  xAxisKey: string;
  seriesKeys: string[];
  colors?: string[];
}

const DEFAULT_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function ErrorFallback({ title, description, message }: { title: string; description?: string; message: string }) {
  return (
    <Card className="w-full border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex h-[300px] items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">Try rephrasing your request or check the data source.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, message }: { title: string; description?: string; message: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex h-[300px] items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartCard({
  title,
  description,
  data,
  type,
  xAxisKey,
  seriesKeys,
  colors,
}: ChartCardProps) {
  const [renderError, setRenderError] = React.useState<string | null>(null);

  // Validate and normalize data
  const chartData = React.useMemo(() => {
    try {
      if (!Array.isArray(data)) {
        setRenderError('Invalid data format: expected an array');
        return [];
      }

      if (data.length === 0) {
        return [];
      }

      // Validate xAxisKey exists in data
      const hasXAxisKey = data.some((item) => xAxisKey in item);
      if (!hasXAxisKey) {
        setRenderError(`X-axis key "${xAxisKey}" not found in data`);
        return [];
      }

      // Validate series keys exist in data
      const missingKeys = seriesKeys.filter((key) => 
        !data.some((item) => key in item)
      );
      if (missingKeys.length > 0) {
        setRenderError(`Series keys not found in data: ${missingKeys.join(', ')}`);
        return [];
      }

      // Normalize data - convert string numbers to actual numbers
      const normalized = data.map((item, index) => {
        try {
          const normalizedItem = { ...item };
          
          seriesKeys.forEach((key) => {
            if (key in normalizedItem) {
              const value = normalizedItem[key];
              
              // Convert string numbers to numbers
              if (typeof value === 'string') {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                  normalizedItem[key] = num;
                } else {
                  // If it's not a valid number, set to 0 to prevent chart breaking
                  normalizedItem[key] = 0;
                }
              } else if (typeof value !== 'number') {
                // If it's neither string nor number, coerce to number or 0
                const num = Number(value);
                normalizedItem[key] = isNaN(num) ? 0 : num;
              }
            }
          });
          
          return normalizedItem;
        } catch (err) {
          console.warn(`Error normalizing data item at index ${index}:`, err);
          return item;
        }
      });

      setRenderError(null);
      return normalized;
    } catch (err) {
      setRenderError(`Data processing error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return [];
    }
  }, [data, xAxisKey, seriesKeys]);

  // Build chart config
  const chartConfig = React.useMemo(() => {
    try {
      const config: ChartConfig = {};
      const colorPalette = colors || DEFAULT_CHART_COLORS;

      seriesKeys.forEach((key, index) => {
        config[key] = {
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          color: colorPalette[index % colorPalette.length],
        };
      });

      return config;
    } catch (err) {
      console.error('Error building chart config:', err);
      return {};
    }
  }, [seriesKeys, colors]);

  // Error state - rendering or validation error
  if (renderError) {
    return (
      <ErrorFallback
        title={title}
        description={description}
        message={renderError}
      />
    );
  }

  // Empty state - no data
  if (!chartData || chartData.length === 0) {
    return (
      <EmptyState
        title={title}
        description={description}
        message="No data available to display"
      />
    );
  }

  // Invalid configuration - missing series keys
  if (!seriesKeys || seriesKeys.length === 0) {
    return (
      <ErrorFallback
        title={title}
        description={description}
        message="Chart configuration error: No series keys specified"
      />
    );
  }

  // Invalid configuration - missing xAxisKey
  if (!xAxisKey) {
    return (
      <ErrorFallback
        title={title}
        description={description}
        message="Chart configuration error: X-axis key not specified"
      />
    );
  }

  // Wrap chart rendering in error boundary
  try {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {type === 'bar' && (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey={xAxisKey}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const str = String(value ?? '');
                    return str.length > 15 ? str.slice(0, 15) + '...' : str;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {seriesKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {seriesKeys.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={`var(--color-${key})`}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}

          {type === 'line' && (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey={xAxisKey}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const str = String(value ?? '');
                    return str.length > 15 ? str.slice(0, 15) + '...' : str;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {seriesKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {seriesKeys.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={`var(--color-${key})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}

          {type === 'area' && (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart accessibilityLayer data={chartData}>
                <defs>
                  {seriesKeys.map((key, index) => {
                    const color = chartConfig[key]?.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
                    return (
                      <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey={xAxisKey}
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const str = String(value ?? '');
                    return str.length > 15 ? str.slice(0, 15) + '...' : str;
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {seriesKeys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {seriesKeys.map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={`var(--color-${key})`}
                    fill={`url(#fill-${key})`}
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          )}

          {type === 'pie' && (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey={seriesKeys[0]}
                  nameKey={xAxisKey}
                  innerRadius={60}
                  strokeWidth={5}
                  label={({ name, percent }) => {
                    const displayName = String(name ?? '');
                    const shortName = displayName.length > 12 ? displayName.slice(0, 12) + '...' : displayName;
                    return `${shortName} ${(percent * 100).toFixed(0)}%`;
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    );
  } catch (err) {
    console.error('Error rendering chart:', err);
    return (
      <ErrorFallback
        title={title}
        description={description}
        message={`Chart rendering error: ${err instanceof Error ? err.message : 'Unknown error'}`}
      />
    );
  }
}
