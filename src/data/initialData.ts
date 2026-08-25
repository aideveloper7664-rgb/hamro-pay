import { PaymentLink, Transaction, Notification, MerchantProfile } from '../types';

export const initialLinks: PaymentLink[] = [
  { id: 1, title: 'Graphic Design Package', amount: 2499, orders: 18, active: true, date: 'Updated today' },
  { id: 2, title: 'Website Discovery Session', amount: 999, orders: 9, active: true, date: 'Updated yesterday' },
  { id: 3, title: 'Monthly Retainer — August', amount: 12000, orders: 3, active: true, date: 'Updated 2 days ago' },
  { id: 4, title: 'Branding Consultation', amount: 1499, orders: 7, active: false, date: 'Updated 4 days ago' },
  { id: 5, title: 'Social Media Template Pack', amount: 599, orders: 5, active: true, date: 'Updated 6 days ago' },
  { id: 6, title: 'UX Review', amount: 3999, orders: 2, active: true, date: 'Updated 1 week ago' },
  { id: 7, title: 'Launch Workshop', amount: 2999, orders: 1, active: false, date: 'Updated 1 week ago' }
];

export const initialTransactions: Transaction[] = [
  { id: 't1', type: 'received', ref: 'HP-81JX90', name: 'Kavya Mehta', amount: 2499, status: 'Success', date: 'Today, 10:42 AM' },
  { id: 't2', type: 'received', ref: 'HP-0QW17F', name: 'Naman Studio', amount: 999, status: 'Success', date: 'Yesterday, 6:18 PM' },
  { id: 't3', type: 'withdrawal', ref: 'WD-479203', name: 'UPI · aarav@okhdfc', amount: 5000, status: 'Completed', date: '18 Aug, 1:23 PM' },
  { id: 't4', type: 'received', ref: 'HP-75PA32', name: 'Pari Shah', amount: 12000, status: 'Success', date: '17 Aug, 4:56 PM' },
  { id: 't5', type: 'received', ref: 'HP-22KM70', name: 'Aditya Jain', amount: 1499, status: 'Pending', date: '17 Aug, 2:05 PM' },
  { id: 't6', type: 'received', ref: 'HP-64TR11', name: 'Riya Kapoor', amount: 599, status: 'Failed', date: '16 Aug, 11:10 AM' }
];

export const initialNotifications: Notification[] = [
  { id: 'n1', title: 'Payment received', text: 'Rs. 2,499 was received through Graphic Design Package.', time: 'Today, 10:42 AM', unread: true },
  { id: 'n2', title: 'Wallet withdrawal completed', text: 'Your Rs. 5,000 withdrawal to aarav@okhdfc has been completed.', time: '18 Aug, 1:23 PM', unread: true },
  { id: 'n3', title: 'Your weekly payment snapshot is ready', text: 'You collected Rs. 8,935 across 12 successful payments this week.', time: '18 Aug, 9:00 AM', unread: true },
  { id: 'n4', title: 'New payment theme available', text: 'Explore the updated checkout palette in your merchant settings.', time: '16 Aug, 4:11 PM', unread: false }
];

export const defaultProfile: MerchantProfile = {
  name: 'Aarav Sharma',
  email: 'merchant@hamropay.demo',
  phone: '+977 98765 43210',
  emailReceipts: true,
  withdrawalAlerts: true
};
