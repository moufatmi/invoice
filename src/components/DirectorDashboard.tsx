import React, { useState } from 'react';
import { LogOut, Users, Calendar, Filter, Download, AlertCircle } from 'lucide-react';
import Layout from './Layout';
import InvoiceList from './InvoiceList';
import InvoiceView from './InvoiceView';
import DashboardStats from './DashboardStats';
import { Invoice } from '../types';
import { useInvoices, useDashboardStats, useTodaysInvoices, useAgents } from '../hooks/useSupabaseData';
import { formatCurrency } from '../utils/helpers';

interface DirectorDashboardProps {
  onLogout: () => void;
}

const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ onLogout }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [performanceView, setPerformanceView] = useState<'agents' | 'all'>('agents');

  // Fetch ALL data from Supabase (not filtered by agent for director view)
  const { invoices, loading: invoicesLoading, error: invoicesError, updateInvoice } = useInvoices(); // No agentId = fetch all
  const { stats, loading: statsLoading } = useDashboardStats(); // No agentId = all stats
  const { todaysInvoices, loading: todaysLoading } = useTodaysInvoices(); // No agentId = all today's invoices
  const { agents, loading: agentsLoading } = useAgents();

  const agentsOnly = React.useMemo(() => agents.filter(a => a.role !== 'director'), [agents]);

  const performanceUsers = React.useMemo(() => {
    if (performanceView === 'agents') {
      return agents.filter(a => a.role !== 'director');
    }
    return agents; // for 'all'
  }, [agents, performanceView]);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseInvoiceView = () => {
    setSelectedInvoice(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    // For now, just view the invoice. Edit functionality can be added later
    setSelectedInvoice(invoice);
  };

  const handleDeleteInvoice = (id: string) => {
    // Directors typically shouldn't delete invoices, but we can add this later if needed
    console.log('Delete invoice:', id);
    alert('Directors cannot delete invoices. Please contact system administrator.');
  };

  const handleStatusUpdate = async (invoiceId: string, newStatus: 'draft' | 'sent' | 'paid' | 'overdue') => {
    try {
      await updateInvoice(invoiceId, { status: newStatus });
      
      // Update the selected invoice if it's the one being updated
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice({ ...selectedInvoice, status: newStatus });
      }
      
      // Show success message
      const statusMessages = {
        draft: 'Invoice moved to draft',
        sent: 'Invoice marked as sent to client',
        paid: 'Invoice marked as paid - great job!',
        overdue: 'Invoice marked as overdue'
      };
      
      alert(statusMessages[newStatus]);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error; // Re-throw to be handled by InvoiceView
    }
  };

  const filteredInvoices = React.useMemo(() => {
    let filtered = viewMode === 'today' ? todaysInvoices : invoices;
    
    if (selectedAgent !== 'all') {
      filtered = filtered.filter(inv => inv.agentId === selectedAgent);
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, todaysInvoices, viewMode, selectedAgent]);

  // Agent performance data
  const agentPerformance = React.useMemo(() => {
    return performanceUsers.map(agent => {
      const agentInvoices = invoices.filter(inv => inv.agentId === agent.id);
      const todayInvoices = todaysInvoices.filter(inv => inv.agentId === agent.id);
      const totalRevenue = agentInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);
      
      return {
        ...agent,
        totalInvoices: agentInvoices.length,
        todayInvoices: todayInvoices.length,
        totalRevenue,
        successRate: agentInvoices.length > 0 
          ? Math.round((agentInvoices.filter(inv => inv.status === 'paid').length / agentInvoices.length) * 100)
          : 0
      };
    });
  }, [performanceUsers, invoices, todaysInvoices]);

  // Loading state
  if (invoicesLoading || statsLoading || agentsLoading || todaysLoading) {
    return (
      <Layout 
        title="Director Dashboard" 
        userType="director"
        userName="Moussab"
        onLogout={onLogout}
      >
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (invoicesError) {
    return (
      <Layout 
        title="Director Dashboard" 
        userType="director"
        userName="Moussab"
        onLogout={onLogout}
      >
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">Connection Error</h3>
          <p className="text-red-700 dark:text-red-300 mb-4">{invoicesError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  if (selectedInvoice) {
    return (
      <Layout 
        title="Invoice Details" 
        userType="director"
        userName="Moussab"
        onLogout={onLogout}
      >
        <InvoiceView
          invoice={selectedInvoice}
          onClose={handleCloseInvoiceView}
          onEdit={() => handleEditInvoice(selectedInvoice)}
          onStatusUpdate={handleStatusUpdate}
        />
      </Layout>
    );
  }

  return (
    <Layout 
      title="Director Dashboard" 
      userType="director"
      userName="Moussab"
      onLogout={onLogout}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Director Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of all agency operations and performance</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats stats={stats} />

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'today' | 'all')}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="today">Today's Invoices</option>
                <option value="all">All Invoices</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Agents</option>
                {agentsOnly.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Performance</h3>
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{todaysInvoices.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Invoices Created</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(todaysInvoices.reduce((sum, inv) => sum + inv.total, 0))}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Performance</h3>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <div className="space-y-3">
            {agentPerformance.slice(0, 3).map(agent => (
              <div key={agent.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{agent.department}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">{agent.todayInvoices} today</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{agent.totalInvoices} total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Performance Overview</h3>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-500" />
            <select
                value={performanceView}
                onChange={(e) => setPerformanceView(e.target.value as 'agents' | 'all')}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="agents">Showing Agents</option>
                <option value="all">Showing All Users</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">Agent</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2">Today</div>
            <div className="col-span-2">Total Invoices</div>
            <div className="col-span-2">Revenue</div>
            <div className="col-span-2">Success Rate</div>
          </div>

          {/* Table body */}
          {agentPerformance.map(agent => (
            <div key={agent.id} className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-900 dark:text-white">
              <div className="col-span-2">{agent.name}</div>
              <div className="col-span-2">{agent.department}</div>
              <div className="col-span-2">{agent.todayInvoices}</div>
              <div className="col-span-2">{agent.totalInvoices}</div>
              <div className="col-span-2">{formatCurrency(agent.totalRevenue)}</div>
              <div className="col-span-2">
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${agent.successRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{agent.successRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <InvoiceList
        invoices={filteredInvoices}
        onView={handleViewInvoice}
        onEdit={handleEditInvoice}
        onDelete={handleDeleteInvoice}
        title={viewMode === 'today' ? "Today's Invoices" : "All Invoices"}
      />
    </Layout>
  );
};

export default DirectorDashboard;