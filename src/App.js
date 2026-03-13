import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import apiClient from './apiClient';

const API_BASE = apiClient.defaults.baseURL || 'http://localhost:8083/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '') || 'http://localhost:8083';

function App() {
  const MAIN_CATEGORIES_ORDER = [
    'Computer',
    'Accessori',
    'Networking',
    'Elettronica',
    'Multimedia',
    'Cavi',
    'Ufficio',
    'Scuola e Laboratori',
    'Best sellers',
    'Videosorveglianza',
  ];

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ nome: '', sku: '', ean: '', categoria: '', fornitore: '' });
  const [globalIncrease, setGlobalIncrease] = useState('');
  const [activeNav, setActiveNav] = useState('catalogo');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    nome: '',
    descrizione: '',
    disponibilita: '',
    ean: '',
    prezzoBase: '',
    aumentoPercentuale: '',
    categoriaId: '',
  });
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCode, setNewSupplierCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [error, setError] = useState('');
  const [supplierCsvMessage, setSupplierCsvMessage] = useState('');
  const [supplierImports, setSupplierImports] = useState([]);
  const [loadingSupplierImports, setLoadingSupplierImports] = useState(false);
  const [supplierImportsError, setSupplierImportsError] = useState('');
  const [csvPreviewName, setCsvPreviewName] = useState('');
  const [csvPreviewText, setCsvPreviewText] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const [historyPreviewName, setHistoryPreviewName] = useState('');
  const [historyPreviewText, setHistoryPreviewText] = useState('');
  const [activeCategoryPage, setActiveCategoryPage] = useState('Computer');
  const [canRollbackLastImport, setCanRollbackLastImport] = useState(false);
  const [syncingIcecat, setSyncingIcecat] = useState(false);
  const savingProductRef = useRef(false);

  const selectedSupplier = suppliers.find(
    (s) => String(s.id) === String(selectedSupplierId)
  );

  const categoryRank = (name) => {
    const idx = MAIN_CATEGORIES_ORDER.indexOf(name);
    return idx === -1 ? 999 : idx;
  };

  const formatPrezzo = (v) => {
    if (v == null || v === '') return '—';
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? String(v) : n.toLocaleString('it-IT', { minimumFractionDigits: 2 });
  };

  /** EAN valido = 8-14 cifre. Se ean è SKU o non valido, mostra "EAN non disponibile". */
  const formatEan = (p) => {
    const e = p?.ean;
    if (!e || typeof e !== 'string') return 'EAN non disponibile';
    const digitsOnly = e.replace(/\D/g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 14) return e;
    return 'EAN non disponibile';
  };

  /** SKU valido = non vuoto e non sintetico (EAN-xxx). Se manca o è EAN-xxx, mostra "SKU non disponibile". */
  const formatSku = (p) => {
    const s = p?.sku;
    if (!s || typeof s !== 'string' || !s.trim()) return 'SKU non disponibile';
    if (s.trim().toUpperCase().startsWith('EAN-')) return 'SKU non disponibile'; // SKU sintetico quando il file ha solo EAN
    return s.trim();
  };

  /** Rincaro percentuale effettivamente applicato (stessa priorità del backend). */
  const getRincaroApplicato = (p) => {
    if (p.aumentoPercentuale != null) return p.aumentoPercentuale;
    if (p.categoria && p.categoria.aumentoPercentuale != null)
      return p.categoria.aumentoPercentuale;
    if (p.fornitore && p.fornitore.aumentoPercentuale != null)
      return p.fornitore.aumentoPercentuale;
    if (globalIncrease !== '' && globalIncrease != null) return Number(globalIncrease);
    return null;
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const aName = a?.nome || '';
    const bName = b?.nome || '';
    const aRank = categoryRank(aName);
    const bRank = categoryRank(bName);
    if (aRank !== bRank) return aRank - bRank;
    return aName.localeCompare(bName, 'it', { sensitivity: 'base' });
  });

  /** Lista per il pager: le 10 standard + eventuali categorie aggiunte (11, 12, ...) */
  const categoryPageList = [
    ...MAIN_CATEGORIES_ORDER,
    ...categories
      .map((c) => c.nome)
      .filter((nome) => !MAIN_CATEGORIES_ORDER.includes(nome)),
  ];

  const applyCategoryPage = async (categoryName) => {
    const next = categoryName || '';
    setActiveNav('catalogo');
    setActiveCategoryPage(next || '');
    setFilters((prev) => ({ ...prev, categoria: next }));
    await loadProducts({ categoria: next });
  };

  const loadSupplierImports = async (supplierId) => {
    if (!supplierId) {
      setSupplierImports([]);
      setSupplierImportsError('');
      return { ok: true, count: 0, logs: [] };
    }
    setLoadingSupplierImports(true);
    setSupplierImportsError('');
    try {
      const response = await apiClient.get(`/suppliers/${supplierId}/imports`);
      const data = response.data || [];
      setSupplierImports(data);
      return {
        ok: true,
        count: Array.isArray(data) ? data.length : 0,
        logs: Array.isArray(data) ? data : [],
      };
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setSupplierImports([]);
      setSupplierImportsError(
        details
          ? `Impossibile caricare lo storico import (${details})`
          : 'Impossibile caricare lo storico import'
      );
      return { ok: false, count: 0, logs: [] };
    } finally {
      setLoadingSupplierImports(false);
    }
  };

  const handleDeleteImportLog = async (supplierId, importId) => {
    if (!supplierId || !importId) return;
    if (!window.confirm('Vuoi cancellare questa voce dallo storico import?')) {
      return;
    }
    setError('');
    try {
      await apiClient.delete(`/suppliers/${supplierId}/imports/${importId}`);
      await loadSupplierImports(supplierId);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(
        details
          ? `Errore nella cancellazione dello storico import (${details})`
          : 'Errore nella cancellazione dello storico import'
      );
    }
  };

  const loadProducts = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/products', { params });
      setProducts(response.data);
      try {
        const canRollbackRes = await apiClient.get('/products/can-rollback-last-import');
        const val = canRollbackRes?.data;
        setCanRollbackLastImport(val === true || val === 'true');
      } catch (_) {
        setCanRollbackLastImport(false);
      }
    } catch (e) {
      setError('Errore nel caricamento dei prodotti');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      await apiClient.post('/categories/seed');
    } catch (e) {
      // seed può fallire se le categorie esistono già, non è critico
    }
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data || []);
    } catch (ignored) {
      // ignore for now
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await apiClient.get('/suppliers');
      setSuppliers(response.data);
    } catch (e) {
      // ignore per ora
    }
  };

  const loadGlobalIncrease = async () => {
    try {
      const response = await apiClient.get('/prices/settings');
      if (response.data && response.data.aumentoGlobalePercentuale != null) {
        setGlobalIncrease(response.data.aumentoGlobalePercentuale);
      }
    } catch (e) {
      // ignore for now
    }
  };

  useEffect(() => {
    // default: prima pagina = Computer
    applyCategoryPage('Computer');
    loadCategories();
    loadGlobalIncrease();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      loadSupplierImports(selectedSupplierId);
    } else {
      setSupplierImports([]);
      setSupplierImportsError('');
    }
  }, [selectedSupplierId]);

  useEffect(() => {
    // Quando entriamo nella "cartella" del fornitore, ricarichiamo sempre lo storico
    if (activeNav === 'fornitore-imports' && selectedSupplierId) {
      loadSupplierImports(selectedSupplierId);
    }
  }, [activeNav, selectedSupplierId]);

  const refreshCanRollback = async () => {
    try {
      const res = await apiClient.get('/products/can-rollback-last-import');
      const val = res?.data;
      setCanRollbackLastImport(val === true || String(val).toLowerCase() === 'true');
    } catch (_) {
      setCanRollbackLastImport(false);
    }
  };

  useEffect(() => {
    if (activeNav === 'catalogo') {
      refreshCanRollback();
    }
  }, [activeNav]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (filters.nome) params.nome = filters.nome;
    if (filters.sku) params.sku = filters.sku;
    if (filters.ean) params.ean = filters.ean;
    if (filters.categoria) params.categoria = filters.categoria;
    if (filters.fornitore) params.fornitore = filters.fornitore;
    loadProducts(params);
  };

  const handleImport = async (endpoint, file, supplierId) => {
    if (!file) return;

    if (endpoint !== '/import/suppliers' && !supplierId) {
      setError('Seleziona un fornitore prima di importare.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (supplierId) {
        formData.append('supplierId', supplierId);
      }
      // Non forzare Content-Type: Axios/browser aggiunge automaticamente il boundary corretto
      await apiClient.post(endpoint, formData);
      await loadProducts();
      if (supplierId) {
        // alcuni backend salvano il log import in async: facciamo qualche retry breve
        const sleep = (ms) =>
          new Promise((resolve) => {
            setTimeout(resolve, ms);
          });

        const previousCount = supplierImports.length;
        let result = await loadSupplierImports(supplierId);
        for (const delay of [800, 1200, 2000, 2500]) {
          await sleep(delay);
          result = await loadSupplierImports(supplierId);
          if (result?.ok && result.count > previousCount) break;
        }

        if (result?.ok && result.count === 0) {
          setError(
            "Import completato, ma lo storico risulta vuoto: il backend non sta registrando i log d'import per questo fornitore."
          );
        }

        // Apri automaticamente la preview dell'ultimo import appena registrato
        if (result?.ok && Array.isArray(result.logs) && result.logs.length > 0) {
          const importedFileName = file?.name || file?.originalname;
          const newest =
            (importedFileName &&
              result.logs.find((l) => l?.fileName === importedFileName)) ||
            result.logs[0];
          if (newest?.id) {
            try {
              const fileResponse = await apiClient.get(
                `/suppliers/${supplierId}/imports/${newest.id}/file`,
                { responseType: 'blob' }
              );
              const text = await fileResponse.data.text();
              setHistoryPreviewName(newest.fileName || importedFileName || 'import.csv');
              setHistoryPreviewText(
                text.length > 3000 ? text.slice(0, 3000) + '\n...\n' : text
              );
            } catch (e) {
              // se il file non è disponibile (vecchi log) non blocchiamo la UI
            }
          }
        }
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 413) {
        setError(
          'File troppo grande (HTTP 413). Il server accetta file fino a 100 MB. Riduci le dimensioni del file o dividilo in parti più piccole.'
        );
      } else {
        const data = e?.response?.data;
        const backendMessage =
          (typeof data === 'string' && data) ||
          data?.message ||
          data?.error ||
          data?.detail;
        const details = [
          status ? `HTTP ${status}` : null,
          backendMessage ? String(backendMessage) : null,
        ]
          .filter(Boolean)
          .join(' - ');

        setError(
          details
            ? `Errore durante l'importazione del file (${details})`
            : "Errore durante l'importazione del file"
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCsvToFolder = async (file, supplierId) => {
    if (!file) return;
    if (!supplierId) {
      setError('Seleziona un fornitore prima di salvare il CSV.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', 'PRODOTTI');
      await apiClient.post(`/suppliers/${supplierId}/imports`, formData);
      await loadProducts();
      await loadSupplierImports(supplierId);
      await refreshCanRollback();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 413) {
        setError(
          'File troppo grande (HTTP 413). Il server accetta file fino a 100 MB. Riduci le dimensioni del file o dividilo in parti più piccole.'
        );
      } else {
        const data = e?.response?.data;
        const backendMessage =
          (typeof data === 'string' && data) ||
          data?.message ||
          data?.error ||
          data?.detail;
        const details = [
          status ? `HTTP ${status}` : null,
          backendMessage ? String(backendMessage) : null,
        ]
          .filter(Boolean)
          .join(' - ');
        setError(
          details
            ? `Errore durante il salvataggio del CSV (${details})`
            : 'Errore durante il salvataggio del CSV'
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleApplyImportToCatalog = async (supplierId, importId) => {
    if (!supplierId || !importId) return;
    setUploading(true);
    setError('');
    try {
      await apiClient.post(`/suppliers/${supplierId}/imports/${importId}/apply-products`);
      await loadProducts();
      await loadSupplierImports(supplierId);
      await refreshCanRollback();
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(
        details
          ? `Errore durante l'import nel catalogo (${details})`
          : "Errore durante l'import nel catalogo"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRollbackImport = async (supplierId, importId) => {
    if (!supplierId || !importId) return;
    if (!window.confirm('Annullare le modifiche di questo import? I prodotti verranno ripristinati allo stato precedente.')) {
      return;
    }
    setUploading(true);
    setError('');
    try {
      await apiClient.post(`/suppliers/${supplierId}/imports/${importId}/rollback`);
      await loadProducts();
      await loadSupplierImports(supplierId);
      await refreshCanRollback();
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(
        details
          ? `Errore durante il rollback (${details})`
          : 'Errore durante il rollback'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRollbackLastImport = async () => {
    if (!window.confirm('Annullare l\'ultimo import applicato? I prodotti verranno ripristinati allo stato precedente.')) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      const response = await apiClient.post('/products/rollback-last-import');
      if (response.status === 200) {
        setCanRollbackLastImport(false);
        await loadProducts();
        if (selectedSupplierId) {
          await loadSupplierImports(selectedSupplierId);
        }
      }
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(
        details
          ? `Errore durante il rollback (${details})`
          : 'Errore durante il rollback'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleImportWithPreview = async (endpoint, file, supplierId) => {
    if (!file) return;
    if (supplierId) {
      setSelectedSupplierId(supplierId);
    }
    setCsvPreviewName(file.name || '');
    const isExcel = /\.(xlsx|xls|xml)$/i.test(file.name || '');
    if (isExcel) {
      setCsvPreviewText('[File Excel/XML - anteprima non disponibile. Puoi procedere con "Salva in cartella"].');
    } else {
      try {
        const text = await file.text();
        setCsvPreviewText(
          text.length > 3000 ? text.slice(0, 3000) + '\n...\n' : text
        );
      } catch (e) {
        setCsvPreviewText('');
      }
    }
    setPendingImport({ endpoint, file, supplierId });
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    const { file, supplierId } = pendingImport;
    await handleSaveCsvToFolder(file, supplierId);
    setPendingImport(null);
    setCsvPreviewName('');
    setCsvPreviewText('');
  };

  const handleDiscardImport = () => {
    setPendingImport(null);
    setCsvPreviewName('');
    setCsvPreviewText('');
  };

  const handlePreviewImportLog = async (supplierId, importId, fileName) => {
    if (!supplierId || !importId) return;
    setError('');
    try {
      const response = await apiClient.get(
        `/suppliers/${supplierId}/imports/${importId}/file`,
        { responseType: 'blob' }
      );
      const text = await response.data.text();
      setHistoryPreviewName(fileName || 'import.csv');
      setHistoryPreviewText(
        text.length > 3000 ? text.slice(0, 3000) + '\n...\n' : text
      );
    } catch (e) {
      const status = e?.response?.status;
      setError(
        status
          ? `Errore nel caricamento del CSV importato (HTTP ${status})`
          : 'Errore nel caricamento del CSV importato'
      );
      setHistoryPreviewName(fileName || 'import.csv');
      setHistoryPreviewText('');
    }
  };

  const handleDownloadImportLog = async (supplierId, importId, fileName) => {
    if (!supplierId || !importId) return;
    setError('');
    try {
      const response = await apiClient.get(
        `/suppliers/${supplierId}/imports/${importId}/file`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'import.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const status = e?.response?.status;
      setError(
        status
          ? `Errore nel download del CSV importato (HTTP ${status})`
          : 'Errore nel download del CSV importato'
      );
    }
  };

  const handleGlobalIncreaseSave = async () => {
    if (globalIncrease === '') return;
    try {
      await apiClient.put('/prices/settings/global', null, {
        params: { percent: globalIncrease },
      });
      await loadProducts();
    } catch (e) {
      setError("Errore nel salvataggio dell'aumento globale");
    }
  };

  const handleAddCategory = async (e) => {
    e?.preventDefault?.();
    const nome = (newCategoryName || '').trim();
    if (!nome) return;
    setAddingCategory(true);
    setError('');
    try {
      await apiClient.post('/categories', { nome });
      setNewCategoryName('');
      await loadCategories();
    } catch (e) {
      const data = e?.response?.data;
      const msg =
        typeof data === 'string'
          ? data
          : data?.message || data?.error || 'Errore nella creazione della categoria';
      setError(msg);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (
      !window.confirm(
        `Eliminare la categoria "${categoryName}"? Tutti i prodotti in questa categoria verranno cancellati.`
      )
    ) {
      return;
    }
    setDeletingCategoryId(categoryId);
    setError('');
    try {
      await apiClient.delete(`/categories/${categoryId}`);
      if (String(activeCategoryPage) === String(categoryName)) {
        setActiveCategoryPage('');
        setFilters((prev) => ({ ...prev, categoria: '' }));
        await loadProducts({});
      }
      await loadCategories();
    } catch (e) {
      const data = e?.response?.data;
      const msg =
        typeof data === 'string'
          ? data
          : data?.message || data?.error || 'Errore nell\'eliminazione della categoria';
      setError(msg);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleCategoryIncreaseChange = async (categoryId, value) => {
    try {
      const params = value === '' || value == null ? {} : { percent: Number(value) };
      await apiClient.put(`/categories/${categoryId}/increase`, null, { params });
      await loadCategories();
      await loadProducts(filters.categoria ? { categoria: filters.categoria } : {});
    } catch (e) {
      setError("Errore nel salvataggio dell'aumento categoria");
    }
  };

  const handleSupplierIncreaseChange = async (supplierId, value) => {
    try {
      await apiClient.put(`/suppliers/${supplierId}/increase`, null, {
        params: { percent: value },
      });
      await loadSuppliers();
      await loadProducts();
    } catch (e) {
      setError("Errore nel salvataggio dell'aumento fornitore");
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await apiClient.get('/products/export/csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'catalogo.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Errore durante l\'esportazione CSV');
    }
  };

  const handleExportJson = async () => {
    try {
      const response = await apiClient.get('/products/export/json');
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(response.data, null, 2));
      const link = document.createElement('a');
      link.href = dataStr;
      link.setAttribute('download', 'catalogo.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Errore durante l\'esportazione JSON');
    }
  };

  const handleProductRowClick = (product) => {
    setSelectedProduct(product);
    const pb = product.prezzoBase;
    setProductForm({
      nome: product.nome || '',
      descrizione: product.descrizione || '',
      disponibilita: product.disponibilita ?? '',
      ean: formatEan(product) !== 'EAN non disponibile' ? (product.ean || '') : '',
      prezzoBase: pb != null && pb !== '' ? String(pb) : '',
      aumentoPercentuale: product.aumentoPercentuale ?? '',
      categoriaId: product.categoria ? product.categoria.id : '',
    });
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductSave = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (savingProductRef.current) return;
    savingProductRef.current = true;
    setSavingProduct(true);
    setError('');
    try {
      const form = e.target;
      const elPrezzo = form.elements?.prezzoBase ?? form.querySelector?.('[name="prezzoBase"]');
      const rawPrezzo = elPrezzo?.value ?? productForm.prezzoBase;
      const parsePrezzo = (v) => {
        if (v === '' || v == null || v === undefined) return null;
        const s = String(v).trim().replace(',', '.');
        if (!s) return null;
        const n = parseFloat(s);
        return Number.isNaN(n) ? null : n;
      };
      const prezzoBaseVal = parsePrezzo(rawPrezzo);
      const payload = {
        nome: form.nome?.value ?? productForm.nome,
        descrizione: form.descrizione?.value ?? productForm.descrizione,
        disponibilita: (form.disponibilita?.value ?? productForm.disponibilita) || null,
        ean: (form.ean?.value ?? productForm.ean)?.trim() || null,
        prezzoBase: prezzoBaseVal,
        aumentoPercentuale: (() => {
          const v = form.aumentoPercentuale?.value ?? productForm.aumentoPercentuale;
          return v === '' || v == null ? null : Number(v);
        })(),
        categoriaId: (() => {
          const v = form.categoriaId?.value ?? productForm.categoriaId;
          return v && v !== '' ? (typeof v === 'number' ? v : Number(v)) : null;
        })(),
      };
      const response = await apiClient.put(`/products/${selectedProduct.id}`, payload);
      const savedProduct = response.data;
      const categoryChanged =
        (savedProduct.categoria?.id ?? null) !==
        (selectedProduct.categoria?.id ?? null);
      const params = {};
      if (filters.nome) params.nome = filters.nome;
      if (filters.sku) params.sku = filters.sku;
      if (filters.ean) params.ean = filters.ean;
      if (filters.fornitore) params.fornitore = filters.fornitore;
      if (categoryChanged) {
        const newCategory = savedProduct.categoria?.nome || '';
        if (newCategory || filters.categoria || activeCategoryPage) {
          params.categoria = newCategory || filters.categoria || activeCategoryPage;
        }
        setActiveCategoryPage(newCategory || activeCategoryPage);
        setFilters((prev) => ({ ...prev, categoria: newCategory }));
      } else if (filters.categoria || activeCategoryPage) {
        params.categoria = filters.categoria || activeCategoryPage;
      }
      await loadProducts(params);
      setSelectedProduct(savedProduct);
      const spb = savedProduct.prezzoBase;
      setProductForm({
        nome: savedProduct.nome || '',
        descrizione: savedProduct.descrizione || '',
        prezzoBase: spb != null && spb !== '' ? String(spb) : '',
        aumentoPercentuale: savedProduct.aumentoPercentuale ?? '',
        categoriaId: savedProduct.categoria ? savedProduct.categoria.id : '',
      });
    } catch (e) {
      setError('Errore nel salvataggio del prodotto');
    } finally {
      savingProductRef.current = false;
      setSavingProduct(false);
    }
  };

  const handleProductDelete = async (productId) => {
    if (!productId) return;
    if (!window.confirm('Vuoi cancellare questo prodotto dal catalogo?')) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      await apiClient.delete(`/products/${productId}`);
      setSelectedProduct(null);
      await loadProducts();
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(
        details
          ? `Errore nella cancellazione del prodotto (${details})`
          : 'Errore nella cancellazione del prodotto'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSyncIcecatImages = async (productId) => {
    if (!productId) return;
    setSyncingIcecat(true);
    setError('');
    try {
      const res = await apiClient.post(`/products/${productId}/sync-icecat-images`);
      const added = res?.data?.imagesAdded ?? 0;
      const diagnoseMsg = res?.data?.diagnoseMessage;
      await loadProducts();
      if (selectedProduct?.id === productId) {
        const allRes = await apiClient.get('/products');
        const p = allRes.data?.find((x) => x.id === productId);
        if (p) setSelectedProduct(p);
      }
      setError(added > 0 ? '' : (diagnoseMsg || 'Nessuna immagine trovata su Icecat per questo prodotto (EAN/SKU).'));
    } catch (e) {
      setError('Errore durante il recupero immagini da Icecat.');
    } finally {
      setSyncingIcecat(false);
    }
  };

  const handleSyncAllIcecatImages = async () => {
    setSyncingIcecat(true);
    setError('');
    try {
      const res = await apiClient.post('/products/sync-all-icecat-images');
      const added = res?.data?.imagesAdded ?? 0;
      await loadProducts();
      if (selectedProduct) {
        const allRes = await apiClient.get('/products');
        const p = allRes.data?.find((x) => x.id === selectedProduct.id);
        if (p) setSelectedProduct(p);
      }
      setError(added > 0 ? '' : 'Nessuna immagine trovata su Icecat per i prodotti con EAN valido.');
    } catch (e) {
      setError('Errore durante il recupero immagini da Icecat.');
    } finally {
      setSyncingIcecat(false);
    }
  };

  const handleCatalogReset = async () => {
    if (
      !window.confirm(
        'ATTENZIONE: verranno cancellati tutti i prodotti (le categorie restano). Vuoi continuare?'
      )
    ) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      await apiClient.delete('/products/reset');
      setSelectedProduct(null);
      setSupplierImports([]);
      await loadProducts();
      await loadCategories();
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.error ||
        data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(
        details
          ? `Errore nel reset del catalogo (${details})`
          : 'Errore nel reset del catalogo'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleNewSupplierSave = async (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      return;
    }
    setSavingSupplier(true);
    setError('');
    try {
      const payload = {
        nome: newSupplierName.trim(),
        codice: newSupplierCode.trim() || null,
      };
      await apiClient.post('/suppliers', payload);
      setNewSupplierName('');
      setNewSupplierCode('');
      await loadSuppliers();
    } catch (e) {
      const backendMessage =
        typeof e?.response?.data === 'string'
          ? e.response.data
          : null;
      setError(
        backendMessage || 'Errore nella creazione del fornitore'
      );
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSupplierDelete = async (supplierId) => {
    if (!window.confirm('Sei sicuro di voler cancellare questo fornitore?')) {
      return;
    }
    setSavingSupplier(true);
    setError('');
    try {
      await apiClient.delete(`/suppliers/${supplierId}`);
      await loadSuppliers();
    } catch (e) {
      setError('Errore nella cancellazione del fornitore');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSupplierEdit = async (supplier) => {
    const newName = window.prompt('Nome fornitore', supplier.nome || '');
    if (!newName || !newName.trim()) {
      return;
    }
    const newCode = window.prompt(
      'Codice fornitore (opzionale)',
      supplier.codice || ''
    );
    setSavingSupplier(true);
    setError('');
    try {
      const payload = {
        ...supplier,
        nome: newName.trim(),
        codice: newCode.trim() || null,
      };
      await apiClient.put(`/suppliers/${supplier.id}`, payload);
      await loadSuppliers();
    } catch (e) {
      const backendMessage =
        typeof e?.response?.data === 'string'
          ? e.response.data
          : null;
      setError(
        backendMessage || 'Errore nella modifica del fornitore'
      );
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSupplierCsvClick = async (supplierId) => {
    setSupplierCsvMessage('');
    setError('');
    try {
      const response = await apiClient.get(
        `/products/export/csv/by-supplier/${supplierId}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `catalogo_fornitore_${supplierId}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      if (e.response && e.response.status === 404) {
        setSupplierCsvMessage('CSV non disponibile per questo fornitore');
      } else {
        setError("Errore nel download del CSV del fornitore");
      }
    }
  };

  const handleNavClick = (sectionId) => {
    setActiveNav(sectionId);
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="logo-block">
            <img
              src={process.env.PUBLIC_URL + '/logo.png'}
              alt="Hydra Solutions"
              className="app-logo"
            />
          </div>
          <div>
            <h1>Catalogo virtuale</h1>
            <p>Gestione interna catalogo, prezzi e documenti</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {uploading && (
          <div className="alert alert-info">
            Import in corso, attendere il completamento...
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <nav className="app-nav">
          <button
            type="button"
            className={activeNav === 'catalogo' ? 'app-nav-active' : ''}
            onClick={() => handleNavClick('catalogo')}
          >
            Catalogo virtuale
          </button>
          <button
            type="button"
            className={
              activeNav === 'fornitori' || activeNav === 'fornitore-imports'
                ? 'app-nav-active'
                : ''
            }
            onClick={() => handleNavClick('fornitori')}
          >
            Fornitori
          </button>
          <button
            type="button"
            className={activeNav === 'aumenti' ? 'app-nav-active' : ''}
            onClick={() => handleNavClick('aumenti')}
          >
            Aumenti di prezzo
          </button>
        </nav>

        {activeNav === 'catalogo' && (
          <>
            <section className="card">
              <h2>Catalogo virtuale</h2>

              <div className="category-pager">
                <div className="category-pager-header">
                  <span className="category-pager-title">Pagine per categoria</span>
                  <span className="category-pager-current">
                    Categoria: <strong>{activeCategoryPage || 'Tutte'}</strong>
                  </span>
                </div>
                <div className="category-pager-buttons">
                  {categoryPageList.map((cat, idx) => (
                    <button
                      key={cat}
                      type="button"
                      className={
                        String(activeCategoryPage) === String(cat)
                          ? 'category-page-btn category-page-btn-active'
                          : 'category-page-btn'
                      }
                      onClick={() => applyCategoryPage(cat)}
                      disabled={uploading}
                      title={cat}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <form
                    className="category-add-form"
                    onSubmit={handleAddCategory}
                  >
                    <input
                      type="text"
                      placeholder="Nuova categoria..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      disabled={addingCategory || uploading}
                      className="category-add-input"
                    />
                    <button
                      type="submit"
                      className="category-add-btn"
                      disabled={!newCategoryName.trim() || addingCategory || uploading}
                      title="Aggiungi categoria"
                    >
                      {addingCategory ? '…' : '+'}
                    </button>
                  </form>
                </div>
                <div className="category-legend" aria-label="Legenda pagine categorie">
                  {categoryPageList.map((cat, idx) => {
                    const catObj = categories.find((c) => c.nome === cat);
                    const catId = catObj?.id;
                    return (
                      <div key={cat} className="category-legend-item">
                        <span className="category-legend-num">{idx + 1}</span>
                        <span className="category-legend-name">{cat}</span>
                        {catId != null && (
                          <button
                            type="button"
                            className="category-delete-btn"
                            onClick={() => handleDeleteCategory(catId, cat)}
                            disabled={deletingCategoryId != null || uploading}
                            title={`Elimina "${cat}"`}
                            aria-label={`Elimina categoria ${cat}`}
                          >
                            {deletingCategoryId === catId ? '…' : '×'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <h3>Filtri prodotti</h3>
              <form className="filters" onSubmit={handleSearch}>
                <input
                  type="text"
                  name="nome"
                  placeholder="Nome prodotto"
                  value={filters.nome}
                  onChange={handleFilterChange}
                />
                <input
                  type="text"
                  name="sku"
                  placeholder="SKU"
                  value={filters.sku}
                  onChange={handleFilterChange}
                />
                <input
                  type="text"
                  name="ean"
                  placeholder="EAN"
                  value={filters.ean}
                  onChange={handleFilterChange}
                />
                <input
                  type="text"
                  name="categoria"
                  placeholder="Categoria"
                  value={filters.categoria}
                  onChange={handleFilterChange}
                />
                <input
                  type="text"
                  name="fornitore"
                  placeholder="Nome fornitore"
                  value={filters.fornitore}
                  onChange={handleFilterChange}
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'Caricamento...' : 'Cerca'}
                </button>
                {(filters.categoria || filters.fornitore) && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const nextFilters = { ...filters, categoria: '', fornitore: '' };
                      setFilters(nextFilters);
                      setActiveCategoryPage('');
                      loadProducts({
                        nome: nextFilters.nome,
                        sku: nextFilters.sku,
                        ean: nextFilters.ean,
                        categoria: '',
                        fornitore: '',
                      });
                    }}
                    disabled={loading || uploading}
                  >
                    Mostra tutte
                  </button>
                )}
              </form>

              <h3>Prodotti</h3>
              <div className="products-layout">
                <div className="table-wrapper">
                  <div className="catalog-category-indicator" aria-live="polite">
                    Categoria: <strong>{activeCategoryPage || 'Tutte'}</strong>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th title="Stock Keeping Unit">SKU</th>
                        <th title="European Article Number">EAN</th>
                        <th>Categoria</th>
                        <th>Nome</th>
                        <th>Fornitore</th>
                        <th>Disponibilità (CS)</th>
                        <th>Aumento specifico prodotto (%)</th>
                        <th>Aumento categoria (%)</th>
                        <th>Prezzo base</th>
                        <th>Prezzo finale</th>
                        <th>Descrizione</th>
                        <th>Image</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 && (
                        <tr>
                          <td colSpan="13">Nessun prodotto trovato</td>
                        </tr>
                      )}
                      {products.map((p) => (
                        <tr
                          key={p.id}
                          className={
                            selectedProduct && selectedProduct.id === p.id
                              ? 'row-selected'
                              : ''
                          }
                          onClick={() => handleProductRowClick(p)}
                        >
                          <td>
                            {formatSku(p) === 'SKU non disponibile' ? (
                              <span style={{ color: 'var(--color-error, #c00)' }}>SKU non disponibile</span>
                            ) : (
                              formatSku(p)
                            )}
                          </td>
                          <td title={formatEan(p)}>
                            {formatEan(p) === 'EAN non disponibile' ? (
                              <span style={{ color: 'var(--color-error, #c00)' }}>EAN non disponibile</span>
                            ) : (
                              formatEan(p)
                            )}
                          </td>
                          <td>{p.categoria ? p.categoria.nome : ''}</td>
                          <td>{p.nome}</td>
                          <td>
                            {p.fornitore
                              ? (p.fornitore.codice ? p.fornitore.codice + ' - ' : '') + p.fornitore.nome
                              : '—'}
                          </td>
                          <td>{p.disponibilita && String(p.disponibilita).trim() ? p.disponibilita : '—'}</td>
                          <td>
                            {p.aumentoPercentuale != null
                              ? p.aumentoPercentuale
                              : ''}
                          </td>
                          <td>
                            {getRincaroApplicato(p) != null ? getRincaroApplicato(p) : '—'}
                          </td>
                          <td>
                            {formatPrezzo(p.prezzoBase)}
                          </td>
                          <td>
                            {formatPrezzo(p.prezzoFinale)}
                          </td>
                          <td>
                            {p.descrizione ? (
                              <span title={p.descrizione}>
                                {p.descrizione.length > 50
                                  ? p.descrizione.substring(0, 50) + '…'
                                  : p.descrizione}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="catalog-image-cell">
                            {(() => {
                              const doc = p.documenti?.find((d) =>
                                (d.tipo || '').toLowerCase() === 'immagine' || (d.tipo || '').toLowerCase() === 'image'
                              );
                              const imgUrl = doc?.url || doc?.urlDocumento;
                              // Locali: /api/images/product/... | Esterne: proxy
                              let src = imgUrl;
                              if (imgUrl) {
                                if (imgUrl.startsWith('/api/')) {
                                  src = API_ORIGIN + imgUrl;
                                } else if (imgUrl.includes('icecat') || imgUrl.startsWith('http')) {
                                  src = `${API_BASE}/images/proxy?url=${encodeURIComponent(imgUrl)}`;
                                }
                              }
                              return imgUrl ? (
                                <img
                                  className="catalog-img"
                                  src={src}
                                  alt=""
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <span>—</span>
                              );
                            })()}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-button icon-button-danger"
                              title="Elimina prodotto"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductDelete(p.id);
                              }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="product-detail">
                  <h3>Dettaglio / modifica prodotto</h3>
                  {!selectedProduct && (
                    <p className="muted">
                      Seleziona una riga dalla tabella per modificare il
                      prodotto.
                    </p>
                  )}
                  {selectedProduct && (
                    <>
                      <p className="muted">
                        SKU: {formatSku(selectedProduct) !== 'SKU non disponibile' ? (
                          <strong>{formatSku(selectedProduct)}</strong>
                        ) : (
                          <em style={{ color: 'var(--color-error, #c00)' }}>non disponibile</em>
                        )}
                        {formatEan(selectedProduct) !== 'EAN non disponibile' ? (
                          <> · EAN: <strong>{formatEan(selectedProduct)}</strong></>
                        ) : (
                          <> · EAN: <em style={{ color: 'var(--color-error, #c00)' }}>non disponibile</em></>
                        )}
                        {selectedProduct.disponibilita != null && (
                          <> · Disponibilità (CS): <strong>{selectedProduct.disponibilita}</strong></>
                        )}
                      </p>
                      <form className="product-form" onSubmit={handleProductSave}>
                        <label>
                          Nome
                          <input
                            type="text"
                            name="nome"
                            value={productForm.nome}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          Descrizione
                          <textarea
                            name="descrizione"
                            rows="3"
                            value={productForm.descrizione}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          Disponibilità (CS)
                          <input
                            type="text"
                            name="disponibilita"
                            placeholder="Es. 10, 5+"
                            value={productForm.disponibilita}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          EAN
                          <input
                            type="text"
                            name="ean"
                            placeholder="Es. 8057284620150 (per Icecat)"
                            value={productForm.ean}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          Prezzo base
                          <input
                            type="number"
                            step="0.01"
                            name="prezzoBase"
                            value={productForm.prezzoBase ?? ''}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          Aumento specifico prodotto (%)
                          <input
                            type="number"
                            step="0.01"
                            name="aumentoPercentuale"
                            value={productForm.aumentoPercentuale}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          Categoria
                          <select
                            name="categoriaId"
                            value={productForm.categoriaId}
                            onChange={handleProductFormChange}
                          >
                            <option value="">Nessuna</option>
                            {sortedCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="product-form-actions">
                          <button type="submit" disabled={savingProduct}>
                            {savingProduct
                              ? 'Salvataggio...'
                              : 'Salva modifiche'}
                          </button>
                        </div>
                      </form>

                      <div className="product-documents">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0 }}>Documenti associati</h4>
                          <button
                            type="button"
                            className="icon-button icon-button-secondary"
                            title={`Scarica immagini da Icecat (EAN: ${formatEan(selectedProduct)})`}
                            onClick={() => handleSyncIcecatImages(selectedProduct.id)}
                            disabled={syncingIcecat}
                          >
                            {syncingIcecat ? '...' : '📷 Icecat'}
                          </button>
                        </div>
                        {selectedProduct.documenti &&
                        selectedProduct.documenti.length > 0 ? (
                          <ul>
                            {selectedProduct.documenti.map((d) => {
                              const url = d.url || d.urlDocumento;
                              const href = url?.startsWith('/') ? API_ORIGIN + url : url;
                              const isImg = (d.tipo || '').toLowerCase() === 'immagine' || (d.tipo || '').toLowerCase() === 'image';
                              return (
                                <li key={d.id || `${d.tipo}-${url}`}>
                                  <span>{d.tipoDocumento || d.tipo}: </span>
                                  {isImg && href ? (
                                    <img src={href?.startsWith('/') ? API_ORIGIN + href : (href?.includes('icecat') || href?.startsWith('http') ? `${API_BASE}/images/proxy?url=${encodeURIComponent(href)}` : href)} alt="" style={{ maxWidth: 80, maxHeight: 80, verticalAlign: 'middle' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                  ) : (
                                    <a href={href} target="_blank" rel="noreferrer">{url}</a>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="muted">
                            Nessun documento associato. Clicca &quot;📷 Icecat&quot; per scaricare le immagini automaticamente.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

            </section>

            <section className="card">
              <h2>Esportazione catalogo</h2>
              <div className="export-buttons">
                <button type="button" onClick={handleExportCsv}>
                  Esporta CSV
                </button>
                <button type="button" onClick={handleExportJson}>
                  Esporta JSON
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  title="Importa immagini da Icecat per tutti i prodotti con EAN valido"
                  onClick={handleSyncAllIcecatImages}
                  disabled={syncingIcecat}
                >
                  {syncingIcecat ? 'Sincronizzazione...' : '📷 Icecat (tutti)'}
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  title={canRollbackLastImport ? "Annulla l'ultimo import applicato" : "Nessun import applicato di recente. Applica un import da un fornitore (⇢) per poterlo annullare."}
                  onClick={handleRollbackLastImport}
                  disabled={savingProduct || !canRollbackLastImport}
                >
                  ↩ Annulla ultimo import
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleCatalogReset}
                >
                  Reset catalogo prodotti
                </button>
              </div>
            </section>
          </>
        )}

        {activeNav === 'fornitori' && (
          <>
            <section className="card">
              <h2>Fornitori</h2>
              <div className="suppliers-layout">
                <div>
                  <h3>Crea nuovo fornitore</h3>
                  <form
                    className="supplier-form"
                    onSubmit={handleNewSupplierSave}
                  >
                    <label>
                      Nome fornitore
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                      />
                    </label>
                    <label>
                      Codice fornitore (opzionale)
                      <input
                        type="text"
                        value={newSupplierCode}
                        onChange={(e) => setNewSupplierCode(e.target.value)}
                      />
                    </label>
                    <button type="submit" disabled={savingSupplier}>
                      {savingSupplier ? 'Creazione...' : 'Crea fornitore'}
                    </button>
                  </form>
                </div>
                <div className="table-wrapper">
                  <h3>Elenco fornitori</h3>
                  {supplierCsvMessage && (
                    <p className="muted">{supplierCsvMessage}</p>
                  )}
                  <table>
                    <thead>
                      <tr>
                        <th>Codice</th>
                        <th>Nome</th>
                        <th>Import prodotti (CSV)</th>
                        <th>Scarica CSV</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.length === 0 && (
                        <tr>
                          <td colSpan="5">Nessun fornitore presente</td>
                        </tr>
                      )}
                      {suppliers.map((s) => (
                        <tr
                          key={s.id}
                          className={
                            selectedSupplierId &&
                            String(selectedSupplierId) === String(s.id)
                              ? 'row-selected'
                              : ''
                          }
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedSupplierId(s.id);
                            setActiveNav('fornitore-imports');
                          }}
                        >
                          <td>{s.codice}</td>
                          <td>
                            <strong>{s.nome}</strong>
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                              }}
                            >
                              <input
                                type="file"
                                accept=".csv,.xlsx,.xls,.xml"
                                onChange={(e) => {
                                  // Se scegli un CSV da una riga, selezioniamo quel fornitore
                                  // così preview e storico sono coerenti con il file scelto.
                                  setSelectedSupplierId(s.id);
                                  handleImportWithPreview(
                                    '/suppliers/' + s.id + '/imports',
                                    e.target.files[0],
                                    s.id
                                  );
                                }}
                                disabled={uploading}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                type="button"
                                className="icon-button icon-button-secondary"
                                disabled={
                                  uploading ||
                                  !pendingImport ||
                                  pendingImport.endpoint !==
                                    '/suppliers/' + s.id + '/imports' ||
                                  String(pendingImport.supplierId) !==
                                    String(s.id)
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmImport();
                                }}
                              >
                                Salva in cartella
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-button icon-button-secondary"
                              title="Scarica CSV fornitore"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSupplierCsvClick(s.id);
                              }}
                            >
                              CSV
                            </button>
                          </td>
                          <td>
                            <div className="supplier-actions">
                              <button
                                type="button"
                                className="icon-button icon-button-secondary"
                                title="Modifica fornitore"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSupplierEdit(s);
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="icon-button icon-button-danger"
                                title="Elimina fornitore"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSupplierDelete(s.id);
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {activeNav === 'fornitore-imports' && (
          <section className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {selectedSupplier?.nome
                    ? `Fornitore: ${selectedSupplier.nome}`
                    : `Fornitore: ${selectedSupplierId || '-'}`}
                </h2>
                <p className="muted" style={{ marginTop: '0.35rem' }}>
                  Cartella import CSV{' '}
                  {!loadingSupplierImports && !supplierImportsError && (
                    <span className="badge" style={{ marginLeft: '0.35rem' }}>
                      {supplierImports.length}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="icon-button icon-button-secondary"
                onClick={() => {
                  setHistoryPreviewName('');
                  setHistoryPreviewText('');
                  setCsvPreviewName('');
                  setCsvPreviewText('');
                  setPendingImport(null);
                  setActiveNav('fornitori');
                }}
              >
                ← Indietro
              </button>
            </div>

            {!selectedSupplierId ? (
              <p className="muted" style={{ marginTop: '1rem' }}>
                Seleziona un fornitore dalla lista.
              </p>
            ) : (
              <>
                <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                  <h3 style={{ marginTop: 0 }}>Carica un nuovo CSV</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.xml"
                      disabled={uploading}
                      onChange={(e) =>
                        handleImportWithPreview(
                          '/suppliers/' + selectedSupplierId + '/imports',
                          e.target.files[0],
                          selectedSupplierId
                        )
                      }
                    />
                    <button
                      type="button"
                      disabled={
                        uploading ||
                        !pendingImport ||
                        pendingImport.endpoint !==
                          '/suppliers/' + selectedSupplierId + '/imports' ||
                        String(pendingImport.supplierId) !== String(selectedSupplierId)
                      }
                      onClick={handleConfirmImport}
                    >
                      Salva in cartella
                    </button>
                  </div>
                </div>

                {(csvPreviewName || csvPreviewText) && (
                  <div
                    className="card"
                    style={{ marginTop: '1rem', padding: '1rem' }}
                  >
                    <h4>Preview CSV selezionato</h4>
                    {csvPreviewName && (
                      <p className="muted">
                        File: <strong>{csvPreviewName}</strong>
                      </p>
                    )}
                    {pendingImport && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={handleConfirmImport}
                        >
                          Salva in cartella
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          disabled={uploading}
                          onClick={handleDiscardImport}
                        >
                          Scarta
                        </button>
                      </div>
                    )}
                    {csvPreviewText ? (
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          maxHeight: '240px',
                          overflow: 'auto',
                          margin: 0,
                        }}
                      >
                        {csvPreviewText}
                      </pre>
                    ) : (
                      <p className="muted">Nessuna preview disponibile.</p>
                    )}
                  </div>
                )}

                {(historyPreviewName || historyPreviewText) && (
                  <div
                    className="card"
                    style={{ marginTop: '1rem', padding: '1rem' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <h4 style={{ margin: 0 }}>Contenuto CSV</h4>
                      <button
                        type="button"
                        className="icon-button icon-button-secondary"
                        onClick={() => {
                          setHistoryPreviewName('');
                          setHistoryPreviewText('');
                        }}
                      >
                        Chiudi
                      </button>
                    </div>
                    {historyPreviewName && (
                      <p className="muted">
                        File: <strong>{historyPreviewName}</strong>
                      </p>
                    )}
                    {historyPreviewText ? (
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          maxHeight: '240px',
                          overflow: 'auto',
                          margin: 0,
                        }}
                      >
                        {historyPreviewText}
                      </pre>
                    ) : (
                      <p className="muted">Nessuna preview disponibile.</p>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '1rem' }}>
                  <h3 style={{ marginTop: 0 }}>Elenco CSV importati</h3>
                  {loadingSupplierImports ? (
                    <p className="muted">Caricamento...</p>
                  ) : supplierImportsError ? (
                    <p className="error">{supplierImportsError}</p>
                  ) : supplierImports.length === 0 ? (
                    <p className="muted">Cartella vuota.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>File</th>
                            <th>Tipo</th>
                            <th>Data</th>
                            <th>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierImports.map((log) => (
                            <tr key={log.id}>
                              <td>
                                <strong>{log.fileName}</strong>
                              </td>
                              <td>{log.tipo}</td>
                              <td>{new Date(log.importedAt).toLocaleString()}</td>
                              <td>
                                <button
                                  type="button"
                                  className="icon-button icon-button-secondary"
                                  title="Importa nel catalogo"
                                  disabled={uploading || String(log.tipo).toUpperCase() !== 'PRODOTTI'}
                                  onClick={() =>
                                    handleApplyImportToCatalog(selectedSupplierId, log.id)
                                  }
                                >
                                  ⇢
                                </button>
                                {log.appliedAt && (
                                  <button
                                    type="button"
                                    className="icon-button icon-button-secondary"
                                    title="Annulla import (rollback)"
                                    disabled={uploading || String(log.tipo).toUpperCase() !== 'PRODOTTI'}
                                    onClick={() =>
                                      handleRollbackImport(selectedSupplierId, log.id)
                                    }
                                  >
                                    ↩
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="icon-button icon-button-secondary"
                                  title="Visualizza"
                                  onClick={() =>
                                    handlePreviewImportLog(
                                      selectedSupplierId,
                                      log.id,
                                      log.fileName
                                    )
                                  }
                                >
                                  👁️
                                </button>
                                <button
                                  type="button"
                                  className="icon-button icon-button-secondary"
                                  style={{ marginLeft: '0.35rem' }}
                                  title="Scarica"
                                  onClick={() =>
                                    handleDownloadImportLog(
                                      selectedSupplierId,
                                      log.id,
                                      log.fileName
                                    )
                                  }
                                >
                                  ⬇️
                                </button>
                                <button
                                  type="button"
                                  className="icon-button icon-button-danger"
                                  style={{ marginLeft: '0.35rem' }}
                                  title="Elimina dallo storico"
                                  onClick={() =>
                                    handleDeleteImportLog(selectedSupplierId, log.id)
                                  }
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {activeNav === 'aumenti' && (
          <section className="card aumenti-section">
            <h2>Aumenti di prezzo</h2>

            <div className="aumenti-global">
              <h3>Aumento globale</h3>
              <p className="aumenti-global-desc">Si applica a tutti i prodotti quando non c’è aumento specifico per categoria o fornitore.</p>
              <div className="inline-form">
                <input
                  type="number"
                  step="0.01"
                  placeholder="%"
                  value={globalIncrease}
                  onChange={(e) => setGlobalIncrease(e.target.value)}
                />
                <button type="button" onClick={handleGlobalIncreaseSave}>
                  Salva
                </button>
              </div>
            </div>

            <div className="aumenti-tables">
              <div className="aumenti-table-block">
                <h3>Aumenti per categoria</h3>
                <p className="aumenti-table-desc">Priorità maggiore dell’aumento globale.</p>
                <div className="table-wrapper table-wrapper-compact">
                  <table>
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Aumento (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan="2">Nessuna categoria</td>
                        </tr>
                      )}
                      {sortedCategories.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <span
                              className={
                                c.parent ? 'category-name-sub' : 'category-name-main'
                              }
                            >
                              {c.nome}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={c.aumentoPercentuale || ''}
                              onBlur={(e) =>
                                handleCategoryIncreaseChange(c.id, e.target.value)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="aumenti-table-block">
                <h3>Aumenti per fornitore</h3>
                <p className="aumenti-table-desc">Priorità maggiore dell’aumento globale.</p>
                <div className="table-wrapper table-wrapper-compact">
                  <table>
                    <thead>
                      <tr>
                        <th>Fornitore</th>
                        <th>Aumento (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.length === 0 && (
                        <tr>
                          <td colSpan="2">Nessun fornitore presente</td>
                        </tr>
                      )}
                      {suppliers.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <span className="category-name-main">
                              {s.codice ? `${s.codice} - ` : ''}{s.nome}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={s.aumentoPercentuale || ''}
                              onBlur={(e) =>
                                handleSupplierIncreaseChange(s.id, e.target.value)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
