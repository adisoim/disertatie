import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Bug, Database, Activity, Beaker } from "lucide-react";

const CHART_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

const DBMS_MAP: Record<string, string> = {
  sqlite3: "SQLite",
  sqlite: "SQLite",
  mysql: "MySQL",
  mariadb: "MariaDB",
  tidb: "TiDB",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  cockroachdb: "CockroachDB",
  duckdb: "DuckDB",
};

function normalizeDbms(name: string) {
  if (!name) return "Unknown";
  const clean = name.toLowerCase().trim();
  return DBMS_MAP[clean] || name.trim();
}

function normalizeOracle(name: string) {
  if (!name) return "Unknown";
  
  let clean = name.replace(/_/g, " ").toUpperCase().trim();
  
  if (clean === "WHERE") return "TLP WHERE";
  if (clean === "HAVING") return "TLP HAVING";
  if (clean === "GROUP BY") return "TLP GROUP BY";
  if (clean === "AGGREGATE") return "TLP AGGREGATE";
  if (clean === "DISTINCT") return "TLP DISTINCT";
  
  // Restul corecțiilor
  if (clean === "NOREC") return "NoREC";
  if (clean.includes("QUERY PART")) return "QUERY PART.";
  
  return clean;
}

export default function DashboardPage() {
  const { data: results, isLoading } = useQuery({
    queryKey: ["static-results"],
    queryFn: () => axios.get("/api/results/static").then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: () => axios.get("/api/results/summary").then((r) => r.data),
  });

  if (isLoading) return <DashboardSkeleton />;

  const bugsMap: Record<string, number> = {};
  summary?.forEach((s: any) => {
    const dbms = normalizeDbms(s.dbms);
    bugsMap[dbms] = (bugsMap[dbms] || 0) + (s.total_bugs || 0);
  });
  
  const bugsPerDbms = Object.keys(bugsMap).map((key) => ({
    name: key,
    bugs: bugsMap[key],
  }));

  const throughputMap: Record<string, number> = {};
  results?.forEach((r: any) => {
    const dbms = normalizeDbms(r.dbms);
    const oracle = normalizeOracle(r.oracle);
    const key = `${dbms} ${oracle}`;
    
    if (!throughputMap[key] || (r.throughput_qps && r.throughput_qps > throughputMap[key])) {
      throughputMap[key] = r.throughput_qps || 0;
    }
  });

  const throughputData = Object.keys(throughputMap)
    .filter((key) => throughputMap[key] > 0)
    .map((key) => ({
      name: key,
      throughput: throughputMap[key],
    }));

  throughputData.sort((a, b) => b.throughput - a.throughput);

  const totalBugs = results?.reduce((sum: number, r: any) => sum + (r.bugs_found || 0), 0);
  const totalQueries = results?.reduce((sum: number, r: any) => sum + (r.total_queries || 0), 0);

  const bugsByExpMap = results?.reduce((acc: any, r: any) => {
    const expName = r.experiment ? r.experiment.trim() : "Unknown";
    if (r.bugs_found > 0) {
      acc[expName] = (acc[expName] || 0) + r.bugs_found;
    }
    return acc;
  }, {});

  const pieData = bugsByExpMap
    ? Object.keys(bugsByExpMap).map((key) => ({
        name: key,
        value: bugsByExpMap[key],
      }))
    : [];

  return (
    <div className="w-full space-y-6 pb-10 text-gray-200">
      
      <div className="border-b border-gray-700/50 pb-5 mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white">
          Replication Study <span className="text-blue-500">Dashboard</span>
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Comparative analysis of database testing using SQLancer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard title="Total Bugs Found" value={totalBugs} icon={<Bug className="w-5 h-5 text-red-500" />} borderClass="border-red-500" />
        <SummaryCard title="Queries Executed" value={totalQueries?.toLocaleString()} icon={<Activity className="w-5 h-5 text-blue-500" />} borderClass="border-blue-500" />
        <SummaryCard title="Tested DBMS Engines" value={bugsPerDbms.length || 0} icon={<Database className="w-5 h-5 text-emerald-500" />} borderClass="border-emerald-500" />
        <SummaryCard title="Vulnerable Experiments" value={pieData.length || 0} icon={<Beaker className="w-5 h-5 text-purple-500" />} borderClass="border-purple-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="xl:col-span-2 bg-[#1e293b] rounded-lg p-6 border border-gray-700/50 shadow-md">
          <h2 className="text-lg font-bold text-white mb-6">Bug Distribution per DBMS</h2>
          <ResponsiveContainer width="100%" height={380}>
            {/* margin bottom 100 previne taierea numelor lungi gen CockroachDB */}
            <BarChart data={bugsPerDbms} margin={{ top: 10, right: 10, left: -20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#9ca3af" 
                tickLine={false} 
                axisLine={false}
                interval={0} 
                angle={-45}  
                textAnchor="end"
                dy={15}
                tick={{ fill: "#9ca3af", fontSize: 13 }}
              />
              <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#334155', opacity: 0.5 }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="bugs" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1e293b] rounded-lg p-6 border border-gray-700/50 shadow-md flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4">Bugs per Experiment</h2>
          {pieData.length > 0 ? (
             <div className="flex-1 min-h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                     {pieData.map((_: any, index: number) => (
                       <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }} itemStyle={{ color: "#fff" }} />
                   <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "13px", color: "#9ca3af", paddingTop: "20px" }}/>
                 </PieChart>
               </ResponsiveContainer>
             </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-gray-500 italic">
                0 bugs in current selection.
             </div>
          )}
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-lg p-6 border border-gray-700/50 shadow-md">
        <h2 className="text-lg font-bold text-white mb-6">Max Throughput per DBMS & Oracle (Queries/second)</h2>
        <ResponsiveContainer width="100%" height={Math.max(500, throughputData.length * 35)}>
          <BarChart data={throughputData} layout="vertical" margin={{ left: 50, right: 30, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#9ca3af" tickLine={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              width={180}
              interval={0}
              tick={{ fontSize: 13, fill: "#cbd5e1" }}
            />
            <Tooltip cursor={{ fill: '#334155', opacity: 0.5 }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }} />
            <Bar dataKey="throughput" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={22}>
              {throughputData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, borderClass }: { title: string; value: any; icon: React.ReactNode; borderClass: string; }) {
  return (
    <div className={`bg-[#1e293b] border-l-4 ${borderClass} rounded-r-lg p-6 shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-extrabold text-white mt-2">{value}</p>
        </div>
        <div className="p-3 bg-[#0f172a] rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse pb-10 mt-6">
      <div className="h-10 w-80 bg-gray-700 rounded-md mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-[#1e293b] rounded-lg"></div>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-[450px] bg-[#1e293b] rounded-lg"></div>
        <div className="h-[450px] bg-[#1e293b] rounded-lg"></div>
      </div>
      <div className="h-[600px] bg-[#1e293b] rounded-lg"></div>
    </div>
  );
}