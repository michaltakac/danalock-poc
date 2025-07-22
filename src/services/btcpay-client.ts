import axios, { AxiosInstance } from 'axios';
import { BTCPayConfig } from '@/types';

export class BTCPayClient {
  private client: AxiosInstance;
  protected storeId: string;

  constructor(config: BTCPayConfig) {
    this.storeId = config.storeId;
    this.client = axios.create({
      baseURL: config.serverUrl,
      headers: {
        'Authorization': `token ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
      (config: any) => {
        console.log('BTCPay API Request:', {
          url: config.url,
          method: config.method,
          headers: {
            ...config.headers,
            Authorization: config.headers.Authorization ? 
              `token ${String(config.headers.Authorization).substring(6, 10)}...` : 'none'
          },
        });
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify the API connection and permissions
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/v1/stores/${this.storeId}`);
      return response.status === 200;
    } catch (error) {
      console.error('Failed to verify BTCPay connection:', error);
      return false;
    }
  }

  /**
   * Get invoices for analytics with pagination
   */
  async getInvoices(params?: {
    skip?: number;
    take?: number;
    startDate?: string | number;
    endDate?: string | number;
    status?: string[];
    searchTerm?: string;
  }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.skip) queryParams.append('skip', params.skip.toString());
      if (params?.take) queryParams.append('take', params.take.toString());
      
      // Convert dates to Unix timestamps if they're ISO strings
      if (params?.startDate) {
        const timestamp = typeof params.startDate === 'string' 
          ? Math.floor(new Date(params.startDate).getTime() / 1000)
          : params.startDate;
        queryParams.append('startDate', timestamp.toString());
      }
      if (params?.endDate) {
        const timestamp = typeof params.endDate === 'string'
          ? Math.floor(new Date(params.endDate).getTime() / 1000)
          : params.endDate;
        queryParams.append('endDate', timestamp.toString());
      }
      
      if (params?.status) {
        params.status.forEach(s => queryParams.append('status', s));
      }
      if (params?.searchTerm) queryParams.append('searchTerm', params.searchTerm);

      const response = await this.client.get(
        `/api/v1/stores/${this.storeId}/invoices?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to fetch invoices:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
      }
      console.error('Failed to fetch invoices:', error);
      throw error;
    }
  }

  /**
   * Get store information including supported payment methods
   */
  async getStoreInfo() {
    try {
      const response = await this.client.get(`/api/v1/stores/${this.storeId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch store info:', error);
      throw error;
    }
  }

  /**
   * Get payment methods for the store
   */
  async getPaymentMethods() {
    try {
      const response = await this.client.get(
        `/api/v1/stores/${this.storeId}/payment-methods`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      throw error;
    }
  }

  /**
   * Get invoice details by ID
   */
  async getInvoiceById(invoiceId: string) {
    try {
      const response = await this.client.get(
        `/api/v1/stores/${this.storeId}/invoices/${invoiceId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Invoice not found');
        }
        console.error('Failed to fetch invoice details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  /**
   * Check if there's a valid membership (paid invoice within last 30 days)
   * @param membershipMetadata - Optional metadata to filter invoices (e.g., { type: 'membership' })
   * @returns Object with membership status and details
   */
  async checkMembershipStatus(membershipMetadata?: Record<string, any>) {
    try {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get invoices from the last 30 days with "Settled" status
      const invoices = await this.getInvoices({
        startDate: thirtyDaysAgo.toISOString(),
        status: ['Settled'],
        take: 100 // Get up to 100 invoices
      });

      // Filter invoices based on metadata if provided
      let validInvoices = invoices;
      if (membershipMetadata && invoices.length > 0) {
        validInvoices = invoices.filter((invoice: any) => {
          if (!invoice.metadata) return false;
          
          // Check if all metadata properties match
          return Object.entries(membershipMetadata).every(([key, value]) => 
            invoice.metadata[key] === value
          );
        });
      }

      // Check if we have any valid paid invoices
      const hasValidMembership = validInvoices.length > 0;
      
      // Get the most recent valid invoice
      const mostRecentInvoice = hasValidMembership 
        ? validInvoices.reduce((latest: any, current: any) => 
            new Date(current.createdTime * 1000) > new Date(latest.createdTime * 1000) 
              ? current 
              : latest
          )
        : null;

      return {
        isValid: hasValidMembership,
        invoiceCount: validInvoices.length,
        mostRecentInvoice: mostRecentInvoice ? {
          id: mostRecentInvoice.id,
          amount: mostRecentInvoice.amount,
          currency: mostRecentInvoice.currency,
          createdTime: new Date(mostRecentInvoice.createdTime * 1000),
          metadata: mostRecentInvoice.metadata
        } : null,
        expiresAt: mostRecentInvoice 
          ? new Date(new Date(mostRecentInvoice.createdTime * 1000).getTime() + 30 * 24 * 60 * 60 * 1000)
          : null
      };
    } catch (error) {
      console.error('Failed to check membership status:', error);
      throw error;
    }
  }
}