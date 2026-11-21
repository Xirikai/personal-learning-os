"use client";
import { PageHeader } from "@/components/Card";
import { LearningAnalytics } from "@/components/LearningAnalytics";
export default function AnalyticsPage() { return <div><PageHeader title="Статистика" description="Фактическая учёба, план и изменение нагрузки по неделям." /><LearningAnalytics /></div>; }
