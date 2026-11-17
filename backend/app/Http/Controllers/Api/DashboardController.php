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
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $hoy = now()->toDateString();

        // Base query según la visibilidad por rol
        $baseQuery = Convenio::visiblePara($user);

        // Total general de convenios en alcance
        $total = (clone $baseQuery)->count();

        // Convenios firmados vigentes (estado firmado y fecha_fin >= hoy o null)
        $firmadosVigentes = (clone $baseQuery)
            ->where('estado', 'firmado')
            ->where(function ($q) use ($hoy) {
                $q->whereNull('fecha_fin')
                  ->orWhere('fecha_fin', '>=', $hoy);
            })
            ->count();

        // Próximos a vencer (fecha_fin >= hoy y días de preaviso)
        $proximosAVencer = (clone $baseQuery)
            ->whereNotNull('fecha_fin')
            ->where('fecha_fin', '>=', $hoy)
            ->whereRaw('DATEDIFF(fecha_fin, ?) <= COALESCE(dias_preaviso, 30)', [$hoy])
            ->count();

        // Personas únicas vinculadas a convenios
        $personasUnicas = Persona::whereHas('convenios', function ($q) use ($user) {
            $q->visiblePara($user);
        })->count();

        // Distribución por estado
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

        // Distribución por tipo
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

        // Distribución por Unidad Académica
        $porUnidad = (clone $baseQuery)
            ->join('unidades', 'convenios.unidad_id', '=', 'unidades.id')
            ->select('unidades.codigo as unidad', DB::raw('count(*) as cantidad'))
            ->groupBy('unidades.codigo')
            ->get();

        // Distribución por Año (usando fecha_inicio)
        $porAnio = (clone $baseQuery)
            ->whereNotNull('fecha_inicio')
            ->select(DB::raw('YEAR(fecha_inicio) as anio'), DB::raw('count(*) as cantidad'))
            ->groupBy(DB::raw('YEAR(fecha_inicio)'))
            ->orderBy('anio', 'desc')
            ->get();

        // Plazos: convenios firmados vencidos o próximos a vencer, ordenados por fecha_fin
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