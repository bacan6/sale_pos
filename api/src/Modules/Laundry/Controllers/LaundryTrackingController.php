<?php
declare(strict_types=1);

namespace App\Modules\Laundry\Controllers;

use App\Core\Database;
use App\Core\Response;

class LaundryTrackingController {
    public function track(array $params): void {
        $code = trim((string)($params['code'] ?? ''));

        if (empty($code)) {
            Response::error('Kode tracking atau nomor nota wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT lo.id, lo.order_number, lo.tracking_code, lo.customer_name, lo.customer_phone,
                                     lo.service_speed, lo.total_weight, lo.total_amount, lo.paid_amount,
                                     lo.payment_status, lo.status, lo.estimated_completion_at, lo.completed_at,
                                     lo.picked_up_at, lo.created_at,
                                     t.name as tenant_name,
                                     lp.name as perfume_name,
                                     lr.code as rack_code, lr.name as rack_name
                              FROM laundry_orders lo
                              JOIN tenants t ON lo.tenant_id = t.id
                              LEFT JOIN laundry_perfumes lp ON lo.perfume_id = lp.id
                              LEFT JOIN laundry_racks lr ON lo.rack_id = lr.id
                              WHERE lo.tracking_code = ? OR lo.order_number = ?
                              LIMIT 1');
        $stmt->execute([$code, $code]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::error('Pesanan cucian tidak ditemukan. Periksa kembali nomor nota atau kode tracking Anda.', 404);
        }

        // Mask phone for privacy (e.g. 0812****5678)
        $phone = (string)($order['customer_phone'] ?? '');
        if (strlen($phone) > 6) {
            $maskedPhone = substr($phone, 0, 4) . '****' . substr($phone, -3);
            $order['customer_phone_masked'] = $maskedPhone;
        } else {
            $order['customer_phone_masked'] = $phone;
        }
        unset($order['customer_phone']);

        // Items summary
        $iStmt = $db->prepare('SELECT item_name, quantity, unit_price, subtotal FROM laundry_order_items WHERE order_id = ?');
        $iStmt->execute([(int)$order['id']]);
        $order['items'] = $iStmt->fetchAll();

        // Status tracking timeline
        $lStmt = $db->prepare('SELECT from_status, to_status, notes, created_at FROM laundry_status_logs WHERE order_id = ? ORDER BY id ASC');
        $lStmt->execute([(int)$order['id']]);
        $order['timeline'] = $lStmt->fetchAll();

        Response::success($order, 'Status cucian berhasil ditemukan');
    }
}
