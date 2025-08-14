import emailjs from '@emailjs/browser';
import { emailConfig } from '../config/emailjs';

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  try {
    const templateParams = {
      to_email: email,
      reset_link: resetLink,
      user_name: email.split('@')[0]
    };

    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.passwordReset,
      templateParams,
      emailConfig.publicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
};

export const sendOrderConfirmationEmail = async (orderData: any) => {
  try {
    const templateParams = {
      customer_name: orderData.customerName,
      customer_email: orderData.email,
      order_id: orderData.orderId,
      order_total: orderData.total,
      order_items: orderData.items.map((item: any) => 
        `${item.name} x${item.quantity} - $${item.price}`
      ).join('\n'),
      delivery_address: orderData.address
    };

    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.orderConfirmation,
      templateParams,
      emailConfig.publicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return { success: false, error };
  }
};

export const sendInternalNotification = async (type: string, data: any) => {
  try {
    const templateParams = {
      notification_type: type,
      customer_name: data.customerName || 'N/A',
      customer_email: data.email || 'N/A',
      message: data.message || '',
      timestamp: new Date().toLocaleString(),
      additional_info: JSON.stringify(data, null, 2)
    };

    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.internalNotification,
      templateParams,
      emailConfig.publicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending internal notification:', error);
    return { success: false, error };
  }
};

export const sendProductAvailabilityEmail = async (email: string, productName: string) => {
  try {
    const templateParams = {
      customer_email: email,
      customer_name: email.split('@')[0],
      product_name: productName,
      store_url: window.location.origin
    };

    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.productAvailability,
      templateParams,
      emailConfig.publicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending product availability email:', error);
    return { success: false, error };
  }
};

export const sendSubscriptionConfirmationEmail = async (customerData: any) => {
  try {
    const templateParams = {
      customer_name: customerData.name,
      customer_email: customerData.email,
      plan_name: customerData.planName,
      plan_price: customerData.planPrice,
      expiry_date: customerData.expiryDate,
      company_name: 'Club de Las Orquídeas'
    };

    await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.subscriptionConfirmation,
      templateParams,
      emailConfig.publicKey
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error);
    return { success: false, error };
  }
};