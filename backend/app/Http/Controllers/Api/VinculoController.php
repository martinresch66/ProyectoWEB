<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Convenio;
use App\Models\VinculoConvenio;
use Illuminate\Http\Request;

class VinculoController extends Controller
{
    /**
     * POST /api/agreements/{id}/links
     * Asocia la adenda/específico (origen) con su convenio marco/firmado (destino)
     */
    public function store(Request $request, $id)
    {
        $convenioOrigen = Convenio::find($id);

        if (!$convenioOrigen) {
            return $this->error('Convenio de origen no encontrado', 404);
        }

        if ($convenioOrigen->estado !== 'borrador') {
            return $this->error('Solo se pueden vincular convenios en estado borrador', 422);
        }

        $validated = $request->validate([
            'convenio_destino_id' => 'required|exists:convenios,id',
            'tipo_vinculo'        => 'required|string|in:especifico_de,adenda_de,renovacion_de',
        ]);

        if ((int)$validated['convenio_destino_id'] === (int)$id) {
            return $this->error('Un convenio no puede vincularse consigo mismo', 422);
        }

        $existe = VinculoConvenio::where('convenio_origen_id', $id)
            ->where('convenio_destino_id', $validated['convenio_destino_id'])
            ->exists();

        if ($existe) {
            return $this->error('Este vínculo ya se encuentra registrado', 422);
        }

        $vinculo = VinculoConvenio::create([
            'convenio_origen_id'  => $id,
            'convenio_destino_id' => $validated['convenio_destino_id'],
            'tipo_vinculo'        => $validated['tipo_vinculo'],
        ]);

        return $this->success($vinculo, 'Vínculo registrado exitosamente', 201);
    }

    /**
     * DELETE /api/agreements/{id}/links/{vinculoId}
     */
    public function destroy($id, $vinculoId)
    {
        $vinculo = VinculoConvenio::where('convenio_origen_id', $id)
            ->where('id', $vinculoId)
            ->first();

        if (!$vinculo) {
            return $this->error('Vínculo no encontrado', 404);
        }

        $vinculo->delete();

        return $this->success(null, 'Vínculo eliminado correctamente');
    }
}