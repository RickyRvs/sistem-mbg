<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\{
    BarangController,
    HargaController,
    KategoriController,
    LaporanController,
    ModalBelanjaController,
    PurchaseOrderController,
    StokController,
    SupplierController
};
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware('auth')
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

Route::middleware('auth')->group(function () {

    Route::resource('barang', BarangController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::resource('kategori', KategoriController::class)
        ->only(['store', 'update', 'destroy']);

    Route::resource('supplier', SupplierController::class)
        ->only(['show', 'store', 'update', 'destroy']);

    Route::resource('modal-belanja', ModalBelanjaController::class)
        ->only(['store', 'update', 'destroy'])
        ->parameters(['modal-belanja' => 'modalBelanja']);

    Route::resource('po', PurchaseOrderController::class)
        ->only(['index', 'create', 'store', 'show', 'destroy'])
        ->parameters([
            'po' => 'purchaseOrder'
        ]);

    Route::patch(
        'po/{purchaseOrder}/harga',
        [PurchaseOrderController::class, 'updateHarga']
    );

    Route::patch(
        'po/{purchaseOrder}/status',
        [PurchaseOrderController::class, 'updateStatus']
    );

    Route::get(
        'stok',
        [StokController::class, 'index']
    );

    Route::post(
        'stok',
        [StokController::class, 'store']
    );

    Route::post(
        'stok/opname',
        [StokController::class, 'opname']
    );

    Route::get(
        'harga',
        [HargaController::class, 'index']
    );

    Route::get(
        'laporan',
        [LaporanController::class, 'index']
    );
});

require __DIR__.'/auth.php';