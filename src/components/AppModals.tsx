import React from 'react';
import { DecisionDetailModal } from './DecisionDetailModal';
import { ScenarioModal } from './ScenarioModal';
import { CapitalAndModeWizardModal } from './CapitalAndModeWizardModal';
import { CleanStartModal } from './CleanStartModal';
import { HourlyReportsModal } from './HourlyReportsModal';
import { DecisionLog, StrategySettings, UserStats, HourlyReport, DisqualifiedPattern } from '../types';

interface AppModalsProps {
  viewingDecision: DecisionLog | null;
  onCloseDecision: () => void;
  isScenarioModalOpen: boolean;
  onCloseScenario: () => void;
  onApplyScenario: (id: number) => void;
  isCapitalWizardOpen: boolean;
  onCloseCapitalWizard: () => void;
  settings: StrategySettings;
  stats: UserStats;
  onApplyCapitalAndConfig: (newCapital: number, updatedSettings: StrategySettings) => void;
  isCleanStartOpen: boolean;
  onCloseCleanStart: () => void;
  onConfirmCleanReset: (
    newCapital: number,
    mode: 'PAPER' | 'LIVE',
    options: { wipeTradeHistory: boolean; wipeDecisions: boolean; wipeDisqualified: boolean }
  ) => void;
  isHourlyReportsOpen: boolean;
  onCloseHourlyReports: () => void;
  hourlyReports: HourlyReport[];
  disqualifiedPatterns: DisqualifiedPattern[];
  onGenerateCurrentHourReport: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  viewingDecision,
  onCloseDecision,
  isScenarioModalOpen,
  onCloseScenario,
  onApplyScenario,
  isCapitalWizardOpen,
  onCloseCapitalWizard,
  settings,
  stats,
  onApplyCapitalAndConfig,
  isCleanStartOpen,
  onCloseCleanStart,
  onConfirmCleanReset,
  isHourlyReportsOpen,
  onCloseHourlyReports,
  hourlyReports,
  disqualifiedPatterns,
  onGenerateCurrentHourReport,
}) => {
  return (
    <>
      <DecisionDetailModal
        decision={viewingDecision}
        onClose={onCloseDecision}
      />

      <ScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={onCloseScenario}
        onApplyScenario={onApplyScenario}
      />

      <CapitalAndModeWizardModal
        isOpen={isCapitalWizardOpen}
        onClose={onCloseCapitalWizard}
        settings={settings}
        stats={stats}
        onApplyConfig={onApplyCapitalAndConfig}
      />

      <CleanStartModal
        isOpen={isCleanStartOpen}
        onClose={onCloseCleanStart}
        onConfirmReset={onConfirmCleanReset}
        currentCapital={stats.balance}
        currentMode={settings.tradingExecutionMode || 'PAPER'}
      />

      <HourlyReportsModal
        isOpen={isHourlyReportsOpen}
        onClose={onCloseHourlyReports}
        reports={hourlyReports}
        disqualifiedPatterns={disqualifiedPatterns}
        onGenerateCurrentHourReport={onGenerateCurrentHourReport}
        settings={settings}
      />
    </>
  );
};
