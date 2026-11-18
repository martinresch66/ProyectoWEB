<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Convenio;          
use App\Models\Persona;           
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; 

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard
     * Calcula todas las métricas, gráficos y alertas de vencimiento respetando el alcance de visibilidad del usuario.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $hoy = now()->toDateString(); 

   
        $baseQuery = Convenio::visiblePara($user);

        // 2. KPI 1: Total de convenios visibles para este usuario (`SELECT COUNT(*) FROM convenios WHERE ...`).
        $total = (clone $baseQuery)->count();

        /*
         * 3. KPI 2: Convenios firmados y actualmente vigentes.
         */
        $firmadosVigentes = (clone $baseQuery)
            ->where('estado', 'firmado')
            ->where(function ($q) use ($hoy) {
                $q->whereNull('fecha_fin')
                  ->orWhere('fecha_fin', '>=', $hoy);
            })
            ->count();

        /*
         * 4. KPI 3: Convenios próximos a vencer dentro de su ventana de preaviso.
         * - `DATEDIFF(fecha_fin, ?)`: Función de MySQL que devuelve cuántos días faltan hasta `fecha_fin`.
         * - `COALESCE(dias_preaviso, 30)`: Si el convenio tiene `dias_preaviso` en NULL en la BD, asume 30 días por defecto.
         */
        $proximosAVencer = (clone $baseQuery)
            ->whereNotNull('fecha_fin')
            ->where('fecha_fin', '>=', $hoy)
            ->whereRaw('DATEDIFF(fecha_fin, ?) <= COALESCE(dias_preaviso, 30)', [$hoy])
            ->count();

        /*
         * 5. KPI 4: Personas únicas vinculadas a convenios visibles por este usuario.
         */
        $personasUnicas = Persona::whereHas('convenios', function ($q) use ($user) {
            $q->visiblePara($user);
        })->count();

        /*
         * 6. Gráfico de distribución por estado:
         */
        $estadosList = ['borrador', 'revision', 'aprobado', 'firmado', 'rescindido', 'archivado'];
        $porEstadoRaw = (clone $baseQuery)
            ->select('estado', DB::raw('count(*) as cantidad'))
            ->groupBy('estado')
            ->pluck('cantidad', 'estado')
            ->toArray();

        $porEstado = [];
        foreach ($estadosList as $e) {
            $porEstado[$e] = $porEstadoRaw[$e] ?? 0;
        }

        // 7. Gráfico de distribución por tipo
        $tiposList = ['marco', 'especifico', 'adenda', 'pasantia'];
        $porTipoRaw = (clone $baseQuery)
            ->select('tipo', DB::raw('count(*) as cantidad'))
            ->groupBy('tipo')
            ->pluck('cantidad', 'tipo')
            ->toArray();

        $porTipo = [];
        foreach ($tiposList as $t) {
            $porTipo[$t] = $porTipoRaw[$t] ?? 0;
        }

        /*
         * 8. Distribución por Unidad Académica:
         */
        $porUnidad = (clone $baseQuery)
            ->join('unidades', 'convenios.unidad_id', '=', 'unidades.id')
            ->select('unidades.codigo as unidad', DB::raw('count(*) as cantidad'))
            ->groupBy('unidades.codigo')
            ->get();

        /*
         * 9. Evolución histórica por Año:
         */
        $porAnio = (clone $baseQuery)
            ->whereNotNull('fecha_inicio')
            ->select(DB::raw('YEAR(fecha_inicio) as anio'), DB::raw('count(*) as cantidad'))
            ->groupBy(DB::raw('YEAR(fecha_inicio)'))
            ->orderBy('anio', 'desc')
            ->get();

        /*
         * 10. Panel de alertas / plazos críticos (`plazos`):
         */
        $plazos = (clone $baseQuery)
            ->with(['unidad'])
            ->where('estado', 'firmado')
            ->whereNotNull('fecha_fin')
            ->where(function ($q) use ($hoy) {
                $q->where('fecha_fin', '<', $hoy)
                  ->orWhereRaw('DATEDIFF(fecha_fin, ?) <= COALESCE(dias_preaviso, 30)', [$hoy]);
            })
            ->orderBy('fecha_fin', 'asc')
            ->limit(10)
            ->get();

        // 11. Devuelve el objeto consolidado en una única respuesta HTTP JSON para renderizar todo el dashboard de una sola vez.
        return response()->json([
            'total'             => $total,
            'firmados_vigentes' => $firmadosVigentes,
            'proximos_a_vencer' => $proximosAVencer,
            'personas_unicas'   => $personasUnicas,
            'por_estado'        => $porEstado,
            'por_tipo'          => $porTipo,
            'por_unidad'        => $porUnidad,
            'por_anio'          => $porAnio,
            'plazos'            => $plazos,
        ]);
    }
}