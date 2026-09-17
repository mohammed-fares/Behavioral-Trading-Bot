/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Behavioral Bot — بوت التداول السلوكي متعدد الأطر الزمنية
 * التطبيق الرئيسي الذي يربط بين المحرك السلوكي، التخزين، بيانات الأسواق، والواجهات السبع
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { MultiTimeframeBoard } from './components/MultiTimeframeBoard';
import { PatternExplorer } from './components/PatternExplorer';
import { DecisionLogTab } from './components/DecisionLogTab';
import { TradesHistoryTab } from './components/TradesHistoryTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { BacktestTab } from './components/BacktestTab';
import { SystemAuditTab } from './components/SystemAuditTab';
import { SettingsTab } from './components/SettingsTab';
import { OfflineBanner } from './components/OfflineBanner';
import { AppModals } from './components/AppModals';
import { useTradingBot } from './hooks/useTradingBot';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const bot = useTradingBot();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Feedback */}
      {bot.toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 font-medium">
          {bot.toastMessage}
        </div>
      )}

      {/* Network Disconnection Alert Banner */}
      <OfflineBanner
        isConnectionLost={bot.isConnectionLost}
        reconnectCount={bot.reconnectCount}
        isReconnecting={bot.isReconnecting}
        onManualReconnect={bot.handleManualReconnect}
      />

      {/* Header & Quick Actions */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={bot.stats}
        settings={bot.settings}
        isAutoScanning={bot.isAutoScanning}
        setIsAutoScanning={bot.setIsAutoScanning}
        onManualScan={() => bot.runBehavioralScan()}
        onOpenScenarios={() => bot.setIsScenarioModalOpen(true)}
        onOpenTestScanModal={() => bot.runBehavioralScan()}
        onOpenCapitalWizard={() => bot.setIsCapitalWizardOpen(true)}
        onOpenCleanStart={() => bot.setIsCleanStartOpen(true)}
        onOpenHourlyReports={() => bot.setIsHourlyReportsOpen(true)}
        isScanningNow={bot.isScanningNow}
        totalSwings={bot.swings.length}
        totalPatterns={bot.patterns.length}
        hourlyReportsCount={bot.hourlyReports.length}
        disqualifiedCount={bot.disqualifiedPatterns.length}
        isConnectionLost={bot.isConnectionLost}
        reconnectCount={bot.reconnectCount}
        onManualReconnect={bot.handleManualReconnect}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={bot.stats}
            settings={bot.settings}
            activeTrades={bot.activeTrades}
            recentDecisions={bot.decisionLogs}
            patterns={bot.patterns}
            totalSwings={bot.swings.length}
            isAutoScanning={bot.isAutoScanning}
            setIsAutoScanning={bot.setIsAutoScanning}
            onCloseTrade={bot.handleCloseTradeManual}
            onOpenScenarios={() => bot.setIsScenarioModalOpen(true)}
            onOpenCapitalWizard={() => bot.setIsCapitalWizardOpen(true)}
            onOpenCleanStart={() => bot.setIsCleanStartOpen(true)}
            onOpenHourlyReports={() => bot.setIsHourlyReportsOpen(true)}
            onViewDecision={(d) => bot.setViewingDecision(d)}
            onEmergencyCloseAll={bot.handleEmergencyCloseAll}
            hourlyReports={bot.hourlyReports}
            disqualifiedPatterns={bot.disqualifiedPatterns}
            onExportCurrentHourReport={bot.handleGenerateHourlyReportNow}
            dbStats={bot.dbStats}
            isConnectionLost={bot.isConnectionLost}
            reconnectCount={bot.reconnectCount}
            onManualReconnect={bot.handleManualReconnect}
          />
        )}

        {activeTab === 'matrix' && (
          <MultiTimeframeBoard
            tickers={bot.tickers}
            onScanCoin={(coin) => bot.runBehavioralScan(coin)}
            onOpenDecisionForCoin={(coin) => {
              const matched = bot.decisionLogs.find(d => d.coin === coin) || bot.decisionLogs[0];
              if (matched) bot.setViewingDecision(matched);
            }}
          />
        )}

        {activeTab === 'explorer' && (
          <PatternExplorer
            patterns={bot.patterns}
            minOccurrences={bot.settings.minOccurrences}
            onUpdatePatternRepetition={bot.handleUpdatePatternRepetition}
            onUpdateMinOccurrences={bot.handleUpdateMinOccurrences}
            onMineHistoricalPatterns={bot.handleMineHistoricalPatterns}
            onMineAllCoins={bot.handleMineAllCoins}
            isMining={bot.isMiningPatterns}
            miningStatus={bot.miningStatus}
            miningProgress={bot.miningProgress}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionLogTab
            decisions={bot.decisionLogs}
            patterns={bot.patterns}
            minOccurrences={bot.settings.minOccurrences}
            onViewDecision={(d) => bot.setViewingDecision(d)}
            onOpenScenarios={() => bot.setIsScenarioModalOpen(true)}
            onUpdatePatternRepetition={bot.handleUpdatePatternRepetition}
            onUpdateMinOccurrences={bot.handleUpdateMinOccurrences}
          />
        )}

        {activeTab === 'trades' && (
          <TradesHistoryTab
            closedTrades={bot.closedTrades}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            stats={bot.stats}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestTab
            settings={bot.settings}
          />
        )}

        {activeTab === 'audit' && (
          <SystemAuditTab
            settings={bot.settings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={bot.settings}
            onSaveSettings={bot.handleSaveSettings}
            onResetMemory={bot.handleResetMemory}
            onExportMemory={bot.handleExportMemory}
            onImportMemory={bot.handleImportMemory}
            onOpenCapitalWizard={() => bot.setIsCapitalWizardOpen(true)}
          />
        )}
      </main>

      {/* App Modals Overlay */}
      <AppModals
        viewingDecision={bot.viewingDecision}
        onCloseDecision={() => bot.setViewingDecision(null)}
        isScenarioModalOpen={bot.isScenarioModalOpen}
        onCloseScenario={() => bot.setIsScenarioModalOpen(false)}
        onApplyScenario={bot.handleApplyScenario}
        isCapitalWizardOpen={bot.isCapitalWizardOpen}
        onCloseCapitalWizard={() => bot.setIsCapitalWizardOpen(false)}
        settings={bot.settings}
        stats={bot.stats}
        onApplyCapitalAndConfig={bot.handleApplyCapitalAndConfig}
        isCleanStartOpen={bot.isCleanStartOpen}
        onCloseCleanStart={() => bot.setIsCleanStartOpen(false)}
        onConfirmCleanReset={bot.handleConfirmCleanReset}
        isHourlyReportsOpen={bot.isHourlyReportsOpen}
        onCloseHourlyReports={() => bot.setIsHourlyReportsOpen(false)}
        hourlyReports={bot.hourlyReports}
        disqualifiedPatterns={bot.disqualifiedPatterns}
        onGenerateCurrentHourReport={bot.handleGenerateHourlyReportNow}
      />
    </div>
  );
}
