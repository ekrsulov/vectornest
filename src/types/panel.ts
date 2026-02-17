import type { ComponentType, LazyExoticComponent } from 'react';

export interface PanelConditionContext {
    activePlugin: string | null;
    showFilePanel: boolean;
    showSettingsPanel: boolean;
    showLibraryPanel: boolean;
    isInSpecialPanelMode: boolean;
    canPerformOpticalAlignment: boolean;
    llmAssistantConfigured?: boolean;
    selectedSubpathsCount: number;
    selectedCommandsCount: number;
    selectedPathsCount: number;
    selectedElementsCount: number;
    totalElementsCount: number;
    hasPathWithMultipleSubpaths: boolean;
    canApplyOffset?: () => boolean;
    activeGroupId?: string | null;
    selectedGroupsCount?: number;
}

export interface PanelComponentProps {
    activePlugin?: string | null;
    panelKey?: string;
}

export interface PanelConfig {
    key: string;
    condition: (ctx: PanelConditionContext) => boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getProps?: (allProps: PanelComponentProps) => any;
    /** Plugin ID that contributed this panel (set automatically for plugin panels) */
    pluginId?: string;
}
