import { contextBridge, ipcRenderer } from "electron";

// Definindo a API segura que será injetada no escopo do window do navegador (renderer)
contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings: any) => ipcRenderer.invoke("save-settings", settings),
  selectProject: () => ipcRenderer.invoke("select-project"),
  loadProject: (projectPath: string) => ipcRenderer.invoke("load-project", projectPath),
  cancelAnalysis: () => ipcRenderer.invoke("cancel-analysis"),
  confirmAnalysis: (proceed: boolean) => ipcRenderer.invoke("confirm-analysis", proceed),
  startAnalysis: (payload: { projectPath: string; options: any }) => ipcRenderer.invoke("start-analysis", payload),
  getServerInfo: () => ipcRenderer.invoke("get-server-info"),
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
  getIgnoreFile: (projectPath: string) => ipcRenderer.invoke("get-ignore-file", projectPath),
  saveIgnoreFile: (projectPath: string, content: string) => ipcRenderer.invoke("save-ignore-file", projectPath, content),
  onProgressUpdate: (callback: (progress: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on("analysis-progress-update", subscription);
    return () => {
      ipcRenderer.removeListener("analysis-progress-update", subscription);
    };
  }
});
