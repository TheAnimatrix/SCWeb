import { and, desc, eq, inArray } from 'drizzle-orm';
import type { ListUserOrdersResponse, UserOrderView } from '../contracts/orders.js';
import { CART_ORDER_STATUS } from '../contracts/cart.js';
import type { Database } from '../db/index.js';
import { orderItems } from '../db/schema/orderItems.js';
import { orders } from '../db/schema/orders.js';
import { paymentAttempts } from '../db/schema/paymentAttempts.js';
import { products } from '../db/schema/products.js';
import { users } from '../db/schema/users.js';
import { asStoredOrderAddresses } from './checkout.js';

const PROFILE_ORDER_STATUSES = [
	CART_ORDER_STATUS.PAID,
	CART_ORDER_STATUS.FULFILLED,
	CART_ORDER_STATUS.FAILED,
	CART_ORDER_STATUS.CANCELLED,
	CART_ORDER_STATUS.REFUNDED
] as const;

export type OrdersStore = {
	listForUser: (userId: string) => Promise<ListUserOrdersResponse>;
};

export function createOrdersStore(db: Database): OrdersStore {
	return {
		async listForUser(userId) {
			const rows = await db
				.select({
					order: orders,
					item: orderItems,
					author: products.author,
					authorTier: users.tier,
					providerPaymentId: paymentAttempts.providerPaymentId
				})
				.from(orders)
				.innerJoin(orderItems, eq(orderItems.orderId, orders.id))
				.leftJoin(products, eq(products.id, orderItems.productId))
				.leftJoin(users, eq(products.uid, users.id))
				.leftJoin(paymentAttempts, eq(paymentAttempts.id, orders.activePaymentAttemptId))
				.where(
					and(
						eq(orders.userId, userId),
						inArray(orders.status, [...PROFILE_ORDER_STATUSES])
					)
				)
				.orderBy(desc(orders.createdAt));

			const byOrderId = new Map<string, UserOrderView>();

			for (const row of rows) {
				const address = asStoredOrderAddresses(row.order.address);
				if (!address) continue;

				let view = byOrderId.get(row.order.id);
				if (!view) {
					view = {
						id: row.order.id,
						cartId: row.order.cartId,
						status: row.order.status,
						totalPaise: row.order.totalPaise,
						subtotalPaise: row.order.subtotalPaise,
						deliveryFeePaise: row.order.deliveryFeePaise,
						createdAt: row.order.createdAt,
						address,
						items: [],
						providerPaymentId: row.providerPaymentId
					};
					byOrderId.set(row.order.id, view);
				}

				view.items.push({
					productId: row.item.productId,
					productName: row.item.productName,
					qty: row.item.qty,
					unitPricePaise: row.item.unitPricePaise,
					author: row.author,
					authorTier: row.authorTier
				});
			}

			return { orders: [...byOrderId.values()] };
		}
	};
}
