<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelFolioController {
    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT hf.*, 
                                     hb.booking_number, hb.check_in_date, hb.check_out_date,
                                     hg.full_name as guest_name, hg.phone as guest_phone, hg.id_card_number,
                                     hr.room_number, hrt.name as room_type_name
                              FROM hotel_folios hf
                              JOIN hotel_bookings hb ON hf.booking_id = hb.id
                              JOIN hotel_guests hg ON hb.guest_id = hg.id
                              JOIN hotel_rooms hr ON hb.room_id = hr.id
                              JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id
                              WHERE (hf.id = ? OR hf.booking_id = ?) AND hf.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $id, $tenantId]);
        $folio = $stmt->fetch();

        if (!$folio) {
            Response::error('Folio tagihan tidak ditemukan', 404);
        }

        $itemStmt = $db->prepare('SELECT * FROM hotel_folio_items WHERE folio_id = ? AND tenant_id = ? ORDER BY id ASC');
        $itemStmt->execute([$folio['id'], $tenantId]);
        $folio['items'] = $itemStmt->fetchAll();

        Response::success($folio);
    }

    public function addItem(array $params): void {
        $folioId = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $category = (string)($body['category'] ?? 'other');
        $description = trim((string)($body['description'] ?? ''));
        $amount = (int)($body['amount'] ?? 0);
        $quantity = max(1, (int)($body['quantity'] ?? 1));

        if ($folioId <= 0 || $description === '' || $amount === 0) {
            Response::error('Deskripsi dan nominal tagihan/biaya wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $fStmt = $db->prepare('SELECT id, status, total_charges, total_payments, balance FROM hotel_folios WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $fStmt->execute([$folioId, $tenantId]);
            $folio = $fStmt->fetch();

            if (!$folio) {
                throw new Exception('Folio tidak ditemukan');
            }

            $totalLine = $amount * $quantity;

            $ins = $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, description, amount, quantity) VALUES (?, ?, ?, ?, ?, ?)');
            $ins->execute([$tenantId, $folioId, $category, $description, $totalLine, $quantity]);

            $newCharges = (int)$folio['total_charges'] + $totalLine;
            $newBalance = $newCharges - (int)$folio['total_payments'];

            $upd = $db->prepare('UPDATE hotel_folios SET total_charges = ?, balance = ? WHERE id = ? AND tenant_id = ?');
            $upd->execute([$newCharges, $newBalance, $folioId, $tenantId]);

            $db->commit();

            Response::success([
                'folio_id' => $folioId,
                'added_amount' => $totalLine,
                'new_balance' => $newBalance,
            ], 'Item tagihan berhasil ditambahkan ke folio');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function settle(array $params): void {
        $folioId = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $amount = (int)($body['amount'] ?? 0);
        $method = (string)($body['method'] ?? 'cash');
        $notes = trim((string)($body['notes'] ?? ''));

        if ($folioId <= 0 || $amount <= 0) {
            Response::error('Nominal pembayaran wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $fStmt = $db->prepare('SELECT id, total_charges, total_payments, balance FROM hotel_folios WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $fStmt->execute([$folioId, $tenantId]);
            $folio = $fStmt->fetch();

            if (!$folio) {
                throw new Exception('Folio tidak ditemukan');
            }

            $desc = 'Pembayaran Masuk (' . strtoupper($method) . ')' . ($notes ? ' - ' . $notes : '');

            $ins = $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, description, amount, quantity) VALUES (?, ?, "payment", ?, ?, 1)');
            $ins->execute([$tenantId, $folioId, $desc, -$amount]);

            $newPayments = (int)$folio['total_payments'] + $amount;
            $newBalance = (int)$folio['total_charges'] - $newPayments;
            $newStatus = $newBalance <= 0 ? 'settled' : 'open';

            $upd = $db->prepare('UPDATE hotel_folios SET total_payments = ?, balance = ?, status = ? WHERE id = ? AND tenant_id = ?');
            $upd->execute([$newPayments, $newBalance, $newStatus, $folioId, $tenantId]);

            $db->commit();

            Response::success([
                'folio_id' => $folioId,
                'paid_amount' => $amount,
                'remaining_balance' => $newBalance,
                'status' => $newStatus,
            ], 'Pembayaran folio berhasil dicatat');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
