<?php
declare(strict_types=1);

namespace App\Modules\Laundry\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use App\Modules\Accounting\Services\AccountingPostingService;
use Exception;

class LaundryPaymentController {
    public function store(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $orderId = (int)($body['order_id'] ?? 0);
        $amount = round(max(0.0, (float)($body['amount'] ?? 0)), 2);
        $paymentMethod = in_array($body['payment_method'] ?? '', ['cash', 'card', 'qris', 'room_charge', 'transfer'], true) ? $body['payment_method'] : 'cash';
        $referenceNumber = trim((string)($body['reference_number'] ?? ''));

        if ($orderId <= 0 || $amount <= 0) {
            Response::error('Pilih pesanan dan masukkan nominal pembayaran yang valid', 422);
        }

        $oStmt = $db->prepare('SELECT * FROM laundry_orders WHERE id = ? AND tenant_id = ? LIMIT 1');
        $oStmt->execute([$orderId, $tenantId]);
        $order = $oStmt->fetch();

        if (!$order) {
            Response::error('Pesanan laundry tidak ditemukan', 404);
        }

        $totalAmount = (float)$order['total_amount'];
        $alreadyPaid = (float)$order['paid_amount'];
        $remaining = max(0.0, round($totalAmount - $alreadyPaid, 2));

        if ($remaining <= 0) {
            Response::error('Pesanan laundry ini sudah lunas', 422);
        }

        $paymentAmount = min($amount, $remaining);

        $db->beginTransaction();
        try {
            // Room Charge handling
            if ($paymentMethod === 'room_charge') {
                $hotelBookingId = (int)($order['hotel_booking_id'] ?? 0);
                if (!$hotelBookingId) {
                    throw new Exception('Pesanan ini tidak terhubung dengan reservasi hotel');
                }

                $fStmt = $db->prepare('SELECT id FROM hotel_folios WHERE booking_id = ? AND tenant_id = ? AND status = "open" LIMIT 1');
                $fStmt->execute([$hotelBookingId, $tenantId]);
                $folioId = (int)$fStmt->fetchColumn();

                if (!$folioId) {
                    throw new Exception('Folio hotel aktif tidak ditemukan untuk reservasi ini');
                }

                $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, source_order_id, description, amount, quantity)
                              VALUES (?, ?, "laundry", ?, ?, ?, 1)')
                   ->execute([$tenantId, $folioId, $orderId, "Pelunasan Laundry {$order['order_number']}", (int)round($paymentAmount)]);

                $db->prepare('UPDATE hotel_folios SET total_charges = total_charges + ?, balance = balance + ? WHERE id = ?')
                   ->execute([(int)round($paymentAmount), (int)round($paymentAmount), $folioId]);

                $referenceNumber = "FOLIO-{$folioId}";
            }

            // Insert payment record
            $insPay = $db->prepare('INSERT INTO laundry_payments (tenant_id, order_id, amount, payment_method, reference_number, cashier_id)
                                    VALUES (?, ?, ?, ?, ?, ?)');
            $insPay->execute([$tenantId, $orderId, $paymentAmount, $paymentMethod, $referenceNumber, $userId]);
            $paymentId = (int)$db->lastInsertId();

            // Update order paid amount
            $newPaid = round($alreadyPaid + $paymentAmount, 2);
            $newPaymentStatus = ($newPaid >= $totalAmount) ? 'paid' : 'partial';

            $db->prepare('UPDATE laundry_orders SET paid_amount = ?, payment_status = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$newPaid, $newPaymentStatus, $orderId, $tenantId]);

            // Post auto-journal to Back-Office Accounting
            AccountingPostingService::postLaundryPaymentJournal(
                $db,
                $tenantId,
                $orderId,
                $paymentId,
                $paymentAmount,
                $paymentMethod,
                (string)$order['order_number'],
                $userId
            );

            $db->commit();

            Response::success([
                'payment_id' => $paymentId,
                'paid_amount' => $paymentAmount,
                'total_paid' => $newPaid,
                'remaining' => max(0.0, round($totalAmount - $newPaid, 2)),
                'payment_status' => $newPaymentStatus,
            ], 'Pembayaran laundry berhasil diproses', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Gagal memproses pembayaran: ' . $e->getMessage(), 500);
        }
    }
}
