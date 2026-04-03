import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from './apiClient';

const API_BASE = apiClient.defaults.baseURL || 'http://localhost:8083/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '') || 'http://localhost:8083';

// Credenziali statiche per accesso pannello admin (pagina login frontend).
const LOGIN_USERNAME = 'bitplanet1234';
const LOGIN_PASSWORD = 'bitplanet';
const AUTH_STORAGE_KEY = 'ecommerce_logged_in';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      const ok = onLogin(username, password);
      if (!ok) {
        setError('Credenziali non valide.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="App login-page">
      <div className="login-bg-orb login-bg-orb-left" />
      <div className="login-bg-orb login-bg-orb-right" />
      <div className="card login-card">
        <div className="login-brand-row">
          <div className="logo-block">
            <img
              src={process.env.PUBLIC_URL + '/logo.png'}
              alt="Hydra Solutions"
              className="app-logo"
            />
          </div>
          <img
            src={process.env.PUBLIC_URL + '/logo%20160x160.webp'}
            alt="Logo"
            className="app-logo-160"
            style={{ width: '72px', height: '72px', objectFit: 'contain' }}
          />
        </div>
        <h2 className="login-title">Login</h2>
        <p className="login-subtitle">Accedi al pannello di gestione catalogo</p>
        <form onSubmit={handleSubmit} className="product-form login-form">
          <label>
            Utente
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Inserisci username"
              disabled={submitting}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Inserisci password"
              disabled={submitting}
              required
            />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="product-form-actions login-actions">
            <button type="submit" className="login-submit-btn" disabled={submitting}>
              {submitting ? 'Accesso...' : 'Accedi'}
            </button>
          </div>
        </form>
        <p className="muted login-hint">
          Inserisci le tue credenziali per accedere.
        </p>
      </div>
    </div>
  );
}

function App() {
  const OFFERTA_CATEGORY_NAME = 'In offerta';
  const NEW_PRODUCTS_CATEGORY_NAME = 'Nuovi prodotti';
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
    NEW_PRODUCTS_CATEGORY_NAME,
    OFFERTA_CATEGORY_NAME,
    'Videosorveglianza',
  ];

  const [authOk, setAuthOk] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY) === '1');

  const [products, setProducts] = useState([]);
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ nome: '', sku: '', ean: '', categoria: '', fornitore: '' });
  const [trashFilters, setTrashFilters] = useState({ nome: '', sku: '', ean: '', categoria: '', fornitore: '' });
  const [globalIncrease, setGlobalIncrease] = useState('');
  const [activeNav, setActiveNav] = useState('catalogo');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    nome: '',
    descrizione: '',
    disponibilita: '',
    ean: '',
    marca: '',
    codiceProduttore: '',
    prezzoBase: '',
    aumentoPercentuale: '',
    categoriaId: '',
  });
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCode, setNewSupplierCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDeletedProducts, setLoadingDeletedProducts] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
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
  const [csvCompareLeftId, setCsvCompareLeftId] = useState('');
  const [csvCompareRightId, setCsvCompareRightId] = useState('');
  const [csvCompareLoading, setCsvCompareLoading] = useState(false);
  const [csvCompareResult, setCsvCompareResult] = useState(null);
  const [csvPreviewName, setCsvPreviewName] = useState('');
  const [csvPreviewText, setCsvPreviewText] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const [historyPreviewName, setHistoryPreviewName] = useState('');
  const [historyPreviewText, setHistoryPreviewText] = useState('');
  const [activeCategoryPage, setActiveCategoryPage] = useState('Computer');
  const [canRollbackLastImport, setCanRollbackLastImport] = useState(false);
  const [showRollbackSelectModal, setShowRollbackSelectModal] = useState(false);
  const [appliedImportsForRollback, setAppliedImportsForRollback] = useState([]);
  const [loadingAppliedImportsForRollback, setLoadingAppliedImportsForRollback] = useState(false);
  const [syncingIcecat, setSyncingIcecat] = useState(false);
  const [syncingMagento, setSyncingMagento] = useState(false);
  const [syncingMagentoSingle, setSyncingMagentoSingle] = useState(false);
  const [syncingMagentoCategories, setSyncingMagentoCategories] = useState(false);
  const [syncingMagentoCurrentCategory, setSyncingMagentoCurrentCategory] = useState(false);
  const [showMagentoCategoryModal, setShowMagentoCategoryModal] = useState(false);
  const [selectedMagentoCategoryId, setSelectedMagentoCategoryId] = useState('');
  const [showEmptyCategoryModal, setShowEmptyCategoryModal] = useState(false);
  const [selectedEmptyCategoryId, setSelectedEmptyCategoryId] = useState('');
  const [emptyingCategory, setEmptyingCategory] = useState(false);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [allProductRevisions, setAllProductRevisions] = useState([]);
  const [loadingAllRevisions, setLoadingAllRevisions] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [catalogFullscreen, setCatalogFullscreen] = useState(false);
  const [exportingToBitplanet, setExportingToBitplanet] = useState(false);
  const [bitplanetMessage, setBitplanetMessage] = useState('');
  const [catalogProductCount, setCatalogProductCount] = useState(null);
  const [manualImageFile, setManualImageFile] = useState(null);
  const [addingDocument, setAddingDocument] = useState(false);
  const [showManualProductForm, setShowManualProductForm] = useState(false);
  const [manualProductForm, setManualProductForm] = useState({
    sku: '',
    nome: '',
    descrizione: '',
    disponibilita: '',
    ean: '',
    marca: '',
    codiceProduttore: '',
    prezzoBase: '',
    aumentoPercentuale: '',
    categoriaId: '',
  });
  const catalogFullscreenRef = useRef(null);
  const fullscreenPortalRef = useRef(null);
  const [fullscreenPortalRoot, setFullscreenPortalRoot] = useState(null);
  const catalogTableRef = useRef(null);
  const savingProductRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [togglingOffer, setTogglingOffer] = useState(false);

  const handleCancelOperation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Chiedi anche al backend di interrompere in modo cooperativo l'import corrente (se attivo)
    try {
      apiClient.post('/import/cancel');
    } catch (e) {
      // Non bloccare la UI se la chiamata di cancel fallisce
    }
    // Se è in corso una sync Magento, chiedi stop cooperativo anche lì
    try {
      apiClient.post('/products/export/magento/cancel');
    } catch (e) {
      // non bloccare la UI
    }
  };

  const setCancelMessage = () => {
    setError('Operazione annullata.');
    setTimeout(() => setError(''), 5000);
  };

  const selectedSupplier = suppliers.find(
    (s) => String(s.id) === String(selectedSupplierId)
  );

  const categoryRank = (name) => {
    const idx = MAIN_CATEGORIES_ORDER.indexOf(name);
    return idx === -1 ? 999 : idx;
  };

  const getCategoryIdByName = (categoryName) => {
    const target = String(categoryName ?? '').trim().toLowerCase();
    if (!target) return '';
    const cat = categories.find((c) => String(c?.nome ?? '').trim().toLowerCase() === target);
    return cat?.id ?? '';
  };

  const formatPrezzo = (v) => {
    if (v == null || v === '') return '—';
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? String(v) : n.toLocaleString('it-IT', { minimumFractionDigits: 2 });
  };

  const isProductInOffer = (p) => {
    if (!p) return false;
    if (p.inOfferta === true) return true;
    const nomeCat = p.categoria?.nome;
    return (
      nomeCat != null &&
      String(nomeCat).trim().toLowerCase() === String(OFFERTA_CATEGORY_NAME).trim().toLowerCase()
    );
  };

  const ensureOfferCategory = async () => {
    const norm = (s) => String(s ?? '').trim().toLowerCase();
    const current = categories.find((c) => norm(c?.nome) === norm(OFFERTA_CATEGORY_NAME));
    if (current) return current;

    // Crea la categoria "In offerta" se non esiste (serve per rendere l'offerta una categoria reale).
    try {
      await apiClient.post('/categories', { nome: OFFERTA_CATEGORY_NAME });
    } catch (e) {
      // se già esiste, oppure seed/creazione falliscono, recuperiamo dalla lista categorie
    }

    const res = await apiClient.get('/categories');
    const list = Array.isArray(res.data) ? res.data : [];
    setCategories(list);
    return list.find((c) => norm(c?.nome) === norm(OFFERTA_CATEGORY_NAME));
  };

  const handleToggleOfferForSelectedProduct = async (product) => {
    if (!product?.id) return;
    if (togglingOffer) return;

    setTogglingOffer(true);
    setError('');
    try {
      const inOffer = isProductInOffer(product);
      // Mantieni la categoria principale invariata: "In offerta" e' un flag separato.
      // Se la categoria virtuale non esiste nella UI la creiamo per poter navigare la pagina.
      if (!inOffer) {
        await ensureOfferCategory();
      }

      // In backend l'update del prodotto sovrascrive i campi, quindi rispediamo i valori correnti
      // e cambiamo solo il flag inOfferta.
      const payload = {
        nome: product.nome,
        descrizione: product.descrizione,
        disponibilita: product.disponibilita ?? null,
        ean: product.ean ?? null,
        marca: product.marca ?? null,
        codiceProduttore: product.codiceProduttore ?? null,
        prezzoBase: product.prezzoBase ?? null,
        aumentoPercentuale: product.aumentoPercentuale ?? null,
        categoriaId: product.categoria?.id ?? null,
        inOfferta: !inOffer,
      };

      await apiClient.put(`/products/${product.id}`, payload);
      setSelectedProduct(null);

      // Dopo il toggle, atterriamo nella lista coerente.
      if (inOffer) {
        await applyCategoryPage('');
      } else {
        await applyCategoryPage(OFFERTA_CATEGORY_NAME);
      }
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) || data?.message || data?.error || data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');

      setError(details ? `Errore nel cambio offerta (${details})` : 'Errore nel cambio offerta');
    } finally {
      setTogglingOffer(false);
    }
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

  const activeCategoryId = activeCategoryPage ? getCategoryIdByName(activeCategoryPage) : '';
  const isOffertaContext = (() => {
    const current = String(filters.categoria || activeCategoryPage || '').trim().toLowerCase();
    return current === String(OFFERTA_CATEGORY_NAME).trim().toLowerCase();
  })();

  const getDisplayedBasePrice = (p) => {
    if (isOffertaContext && p?.prezzoOfferta != null) return p.prezzoOfferta;
    return p?.prezzoBase;
  };
  // Prezzo finale "base" calcolato on-the-fly (uguale formula backend),
  // usato per non far cambiare i prezzi mostrati nelle categorie principali
  // quando un prodotto è marcato anche come "In offerta".
  const computeBaseFinalPriceForDisplay = (p) => {
    const baseRaw = p?.prezzoBase;
    if (baseRaw == null || baseRaw === '') return null;
    const base = typeof baseRaw === 'number' ? baseRaw : Number(baseRaw);
    if (Number.isNaN(base)) return null;

    const rincaro = getRincaroApplicato(p);
    if (rincaro == null || Number.isNaN(Number(rincaro))) return base;
    const r = Number(rincaro);
    return base * (1 + r / 100);
  };
  const csvComparePriceStats = (() => {
    const diffs = Array.isArray(csvCompareResult?.priceDifferences) ? csvCompareResult.priceDifferences : [];
    let lower = 0;
    let higher = 0;
    let unchanged = 0;
    diffs.forEach((d) => {
      const dir = String(d?.direction ?? '').trim().toUpperCase();
      if (dir === 'DIMINUITO') lower += 1;
      else if (dir === 'AUMENTATO') higher += 1;
      else unchanged += 1;
    });
    return { lower, higher, unchanged, total: diffs.length };
  })();
  const normalizeText = (v) => String(v ?? '').trim().toLowerCase();
  const filteredDeletedProducts = deletedProducts.filter((p) => {
    const nomeOk = !trashFilters.nome || normalizeText(p?.nome).includes(normalizeText(trashFilters.nome));
    const skuOk = !trashFilters.sku || normalizeText(p?.sku).includes(normalizeText(trashFilters.sku));
    const eanOk = !trashFilters.ean || normalizeText(p?.ean).includes(normalizeText(trashFilters.ean));
    const categoriaOk =
      !trashFilters.categoria || normalizeText(p?.categoria?.nome).includes(normalizeText(trashFilters.categoria));
    const fornitoreOk =
      !trashFilters.fornitore || normalizeText(p?.fornitore?.nome).includes(normalizeText(trashFilters.fornitore));
    return nomeOk && skuOk && eanOk && categoriaOk && fornitoreOk;
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
    // Pager = vista per categoria; il campo filtro "Categoria" resta separato così una ricerca per
    // nome/SKU non resta bloccata sulla pagina (es. "Computer" mentre gli iPhone sono in "Accessori").
    setFilters((prev) => ({
      ...prev,
      categoria: '',
      nome: '',
      sku: '',
      ean: '',
      fornitore: '',
    }));
    await loadProducts({ categoria: next });
    // "Atterraggio" automatico sulla tabella prodotti (utile quando si clicca dal dettaglio).
    setTimeout(() => {
      catalogTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
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

  const handleCompareSupplierCsv = async () => {
    if (!selectedSupplierId) {
      setError('Seleziona un fornitore prima di comparare i CSV.');
      return;
    }
    if (!csvCompareLeftId || !csvCompareRightId) {
      setError('Seleziona due CSV da comparare.');
      return;
    }
    if (String(csvCompareLeftId) === String(csvCompareRightId)) {
      setError('Seleziona due CSV diversi per il confronto.');
      return;
    }

    setCsvCompareLoading(true);
    setCsvCompareResult(null);
    setError('');
    try {
      const res = await apiClient.get(`/suppliers/${selectedSupplierId}/imports/compare`, {
        params: {
          leftImportId: csvCompareLeftId,
          rightImportId: csvCompareRightId,
        },
      });
      setCsvCompareResult(res?.data || null);
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
          ? `Errore durante la comparazione CSV (${details})`
          : 'Errore durante la comparazione CSV'
      );
    } finally {
      setCsvCompareLoading(false);
    }
  };

  const handleCompareCsvWithDatabase = async (importId) => {
    if (!selectedSupplierId || !importId) {
      setError('Seleziona un fornitore e un CSV valido.');
      return;
    }
    setCsvCompareLoading(true);
    setCsvCompareResult(null);
    setError('');
    try {
      const res = await apiClient.get(`/suppliers/${selectedSupplierId}/imports/${importId}/compare-db`);
      setCsvCompareResult(res?.data || null);
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
          ? `Errore durante la comparazione CSV vs database (${details})`
          : 'Errore durante la comparazione CSV vs database'
      );
    } finally {
      setCsvCompareLoading(false);
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

  const loadCatalogCount = async () => {
    try {
      const res = await apiClient.get('/products/count');
      const n = res?.data?.count;
      setCatalogProductCount(typeof n === 'number' ? n : null);
    } catch (_) {
      setCatalogProductCount(null);
    }
  };

  const handleEmptyCategoryConfirm = async () => {
    if (!selectedEmptyCategoryId) {
      setError('Seleziona una categoria da svuotare.');
      return;
    }
    const cat = categories.find((c) => String(c.id) === String(selectedEmptyCategoryId));
    const label = cat?.nome || 'categoria selezionata';
    if (
      !window.confirm(
        `Svuotare "${label}"?\n\n` +
          '• Categoria normale: tutti i prodotti di quella categoria vanno nel cestino (recuperabili).\n' +
          '• "In offerta": rimuove solo offerta e prezzo promozionale, senza cancellare i prodotti.\n' +
          '• "Nuovi prodotti": rimuove solo il flag nuovi prodotti, senza cancellare.'
      )
    ) {
      return;
    }
    setEmptyingCategory(true);
    setError('');
    try {
      const res = await apiClient.post(`/categories/${selectedEmptyCategoryId}/empty-products`);
      const data = res?.data;
      const affected = typeof data?.affected === 'number' ? data.affected : null;
      setShowEmptyCategoryModal(false);
      setSelectedEmptyCategoryId('');
      await loadProducts(buildCatalogQueryParams());
      await loadCategories();
      alert(
        affected != null
          ? `Operazione completata: ${affected} prodotti elaborati.`
          : 'Operazione completata.'
      );
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
      setError(details ? `Errore nello svuotamento (${details})` : 'Errore nello svuotamento della categoria');
    } finally {
      setEmptyingCategory(false);
    }
  };

  const loadProducts = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/products', { params });
      setProducts(response.data);
      loadCatalogCount();
      try {
        const canRollbackRes = await apiClient.get('/products/can-rollback-last-import');
        const val = canRollbackRes?.data;
        setCanRollbackLastImport(val === true || val === 'true');
      } catch (_) {
        setCanRollbackLastImport(false);
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
      setError(details ? `Errore nel caricamento dei prodotti (${details})` : 'Errore nel caricamento dei prodotti');
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedProducts = async () => {
    setLoadingDeletedProducts(true);
    setError('');
    try {
      const res = await apiClient.get('/products/deleted');
      setDeletedProducts(Array.isArray(res.data) ? res.data : []);
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
      setDeletedProducts([]);
      setError(
        details
          ? `Errore nel caricamento cestino (${details})`
          : 'Errore nel caricamento cestino'
      );
    } finally {
      setLoadingDeletedProducts(false);
    }
  };

  const handleRestoreDeletedProduct = async (productId) => {
    if (!productId) return;
    setSavingProduct(true);
    setError('');
    try {
      await apiClient.post(`/products/${productId}/restore`);
      await loadDeletedProducts();
      await loadProducts(buildCatalogQueryParams());
      await loadCatalogCount();
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
          ? `Errore nel ripristino prodotto (${details})`
          : 'Errore nel ripristino prodotto'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Svuotare il cestino? I prodotti eliminati verranno rimossi definitivamente.')) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      const res = await apiClient.delete('/products/deleted/empty');
      const deleted = res?.data?.deleted ?? 0;
      await loadDeletedProducts();
      await loadCatalogCount();
      alert(`Cestino svuotato: ${deleted} prodotti eliminati definitivamente.`);
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
          ? `Errore nello svuotamento cestino (${details})`
          : 'Errore nello svuotamento cestino'
      );
    } finally {
      setSavingProduct(false);
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
    try {
      const countsRes = await apiClient.get('/categories/counts');
      setCategoryCounts(countsRes?.data && typeof countsRes.data === 'object' ? countsRes.data : {});
    } catch (_) {
      setCategoryCounts({});
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
    if (!authOk) return;
    // default: prima pagina = Computer
    applyCategoryPage('Computer');
    loadCategories();
    loadGlobalIncrease();
    loadSuppliers();
  }, [authOk]);

  useEffect(() => {
    if (!showManualProductForm) return;
    const id = getCategoryIdByName(NEW_PRODUCTS_CATEGORY_NAME);
    if (!id) return;
    setManualProductForm((prev) => {
      if (String(prev.categoriaId) === String(id)) return prev;
      return { ...prev, categoriaId: String(id) };
    });
  }, [showManualProductForm, categories]);

  useEffect(() => {
    if (selectedSupplierId) {
      loadSupplierImports(selectedSupplierId);
    } else {
      setSupplierImports([]);
      setSupplierImportsError('');
    }
    setCsvCompareLeftId('');
    setCsvCompareRightId('');
    setCsvCompareResult(null);
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
    if (!authOk) return;
    if (activeNav === 'catalogo') {
      refreshCanRollback();
    }
  }, [activeNav, authOk]);

  useEffect(() => {
    if (!authOk) return;
    if (activeNav === 'cestino') {
      loadDeletedProducts();
    }
  }, [activeNav, authOk]);

  const handleExportToBitplanet = async () => {
    setExportingToBitplanet(true);
    setBitplanetMessage('');
    setError('');
    try {
      // Esporta il catalogo virtuale in JSON (endpoint già esistente nel backend)
      const response = await apiClient.get('/products/export/json');
      if (!response || !Array.isArray(response.data)) {
        setBitplanetMessage(
          'Esportazione completata, ma il formato ricevuto non è quello atteso. Verifica il backend /products/export/json.'
        );
      } else {
        setBitplanetMessage(
          'Catalogo virtuale esportato correttamente. Configura ora l’integrazione Magento/Bitplanet per consumare questi dati.'
        );
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
          ? `Errore durante l’esportazione del catalogo virtuale verso Bitplanet (${details})`
          : 'Errore durante l’esportazione del catalogo virtuale verso Bitplanet'
      );
    } finally {
      setExportingToBitplanet(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Query verso GET /products: con Nome/SKU/EAN/Fornitore compilati non si applica la categoria del pager,
   * così la ricerca attraversa tutto il catalogo; il filtro categoria si usa solo se scritto nel campo.
   */
  const buildCatalogQueryParams = (f = filters, pageCatOverride) => {
    const pageCat = pageCatOverride !== undefined ? pageCatOverride : activeCategoryPage;
    const params = {};
    if ((f.nome || '').trim()) params.nome = f.nome.trim();
    if ((f.sku || '').trim()) params.sku = f.sku.trim();
    if ((f.ean || '').trim()) params.ean = f.ean.trim();
    if ((f.fornitore || '').trim()) params.fornitore = f.fornitore.trim();
    const hasWideSearch =
      !!(f.nome || '').trim() ||
      !!(f.sku || '').trim() ||
      !!(f.ean || '').trim() ||
      !!(f.fornitore || '').trim();
    const catFromField = (f.categoria || '').trim();
    const pagerCat = (pageCat || '').trim();
    const catEff = hasWideSearch ? catFromField : catFromField || pagerCat;
    if (catEff) params.categoria = catEff;
    return params;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts(buildCatalogQueryParams());
  };

  const handleImport = async (endpoint, file, supplierId) => {
    if (!file) return;

    if (endpoint !== '/import/suppliers' && !supplierId) {
      setError('Seleziona un fornitore prima di importare.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (supplierId) {
        formData.append('supplierId', supplierId);
      }
      // Non forzare Content-Type: Axios/browser aggiunge automaticamente il boundary corretto
      await apiClient.post(endpoint, formData, { signal: controller.signal });
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
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
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
      abortControllerRef.current = null;
      setUploading(false);
    }
  };

  const handleSaveCsvToFolder = async (file, supplierId) => {
    if (!file) return;
    if (!supplierId) {
      setError('Seleziona un fornitore prima di salvare il CSV.');
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', 'PRODOTTI');
      const res = await apiClient.post(`/suppliers/${supplierId}/imports`, formData, { signal: controller.signal });
      const createdLog = res?.data;
      if (createdLog?.id) {
        // Aggiorna subito la lista: evita casi in cui lo storico non si aggiorna/visualizza subito
        setSupplierImports((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const filtered = list.filter((l) => String(l?.id) !== String(createdLog.id));
          return [createdLog, ...filtered];
        });
        setActiveNav('fornitore-imports');
      }
      await loadProducts();
      await loadSupplierImports(supplierId);
      await refreshCanRollback();
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
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
      abortControllerRef.current = null;
      setUploading(false);
    }
  };

  const handleApplyImportToCatalog = async (supplierId, importId) => {
    if (!supplierId || !importId) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUploading(true);
    setError('');
    try {
      await apiClient.post(`/suppliers/${supplierId}/imports/${importId}/apply-products`, null, { signal: controller.signal });
      await loadProducts();
      await loadSupplierImports(supplierId);
      await refreshCanRollback();
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
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
      abortControllerRef.current = null;
      setUploading(false);
    }
  };

  const handleRollbackImport = async (supplierId, importId) => {
    if (!supplierId || !importId) return;
    if (!window.confirm('Annullare le modifiche di questo import? I prodotti verranno ripristinati allo stato precedente.')) {
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUploading(true);
    setError('');
    try {
      await apiClient.post(`/suppliers/${supplierId}/imports/${importId}/rollback`, null, { signal: controller.signal });
      await loadProducts();
      await loadSupplierImports(supplierId);
      await refreshCanRollback();
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
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
      abortControllerRef.current = null;
      setUploading(false);
    }
  };

  const handleRollbackLastImport = async () => {
    if (!canRollbackLastImport) return;
    if (!window.confirm('Annullare l\'ultimo import applicato? I prodotti verranno ripristinati allo stato precedente.')) {
      return;
    }
    setSavingProduct(true);
    setError('');
    setShowRollbackSelectModal(false);
    try {
      await apiClient.post('/products/rollback-last-import');
      await loadProducts();
      if (selectedSupplierId) {
        await loadSupplierImports(selectedSupplierId);
      }
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
          ? `Errore durante il rollback dell'ultimo import (${details})`
          : 'Errore durante il rollback dell\'ultimo import'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const openRollbackSelectModal = async () => {
    setShowRollbackSelectModal(true);
    setLoadingAppliedImportsForRollback(true);
    setAppliedImportsForRollback([]);
    try {
      const res = await apiClient.get('/products/applied-imports');
      let list = Array.isArray(res?.data) ? res.data : [];
      if (list.length === 0 && suppliers.length > 0) {
        const aggregated = [];
        for (const s of suppliers) {
          try {
            const impRes = await apiClient.get(`/suppliers/${s.id}/imports`);
            const logs = Array.isArray(impRes?.data) ? impRes.data : [];
            for (const log of logs) {
              if (log.appliedAt && String(log.tipo || '').toUpperCase() === 'PRODOTTI') {
                aggregated.push({
                  id: log.id,
                  fileName: log.fileName,
                  appliedAt: log.appliedAt,
                  supplierId: s.id,
                  supplierName: s.nome,
                });
              }
            }
          } catch (_) {}
        }
        aggregated.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        list = aggregated;
      }
      setAppliedImportsForRollback(list);
    } catch (_) {
      setAppliedImportsForRollback([]);
    } finally {
      setLoadingAppliedImportsForRollback(false);
    }
  };

  const handleRollbackSelectedImport = async (supplierId, importId) => {
    if (!supplierId || !importId) return;
    if (!window.confirm('Annullare le modifiche di questo import? I prodotti verranno ripristinati allo stato precedente.')) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      await apiClient.post(`/suppliers/${supplierId}/imports/${importId}/rollback`);
      setShowRollbackSelectModal(false);
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
      setSavingProduct(false);
    }
  };

  const handleScrapeTakefiveOffers = async () => {
    if (!selectedSupplierId) return;

    const supplierName = selectedSupplier?.nome ? String(selectedSupplier.nome) : '';
    if (supplierName.toLowerCase() !== 'takefive') {
      setError('Scraping offerte disponibile solo per Takefive.');
      return;
    }

    const requestedNameRaw = window.prompt(
      'Nome file CSV per le offerte (es. offerta7.csv). Lascia vuoto per generare automaticamente (offerta1, offerta2, ...):',
      ''
    );
    // Se l'utente annulla il prompt, interrompi l'operazione
    if (requestedNameRaw === null) return;

    const requestedName = String(requestedNameRaw || '').trim();

    setUploading(true);
    setError('');
    setCsvPreviewName('');
    setCsvPreviewText('');
    setPendingImport(null);

    try {
      const res = await apiClient.post(`/suppliers/${selectedSupplierId}/scrape-offers`, null, {
        params: requestedName ? { fileName: requestedName } : undefined,
      });
      const data = res?.data || {};
      const base64 = data.fileContentBase64;
      const fileName = data.fileName || 'offerte_takefive.csv';
      const fileContentType = data.fileContentType || 'text/csv';

      if (!base64) {
        throw new Error('Risposta scraper senza fileContentBase64.');
      }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const blob = new Blob([bytes], { type: fileContentType });
      const file = new File([blob], fileName, { type: fileContentType });

      await handleImportWithPreview(
        '/suppliers/' + selectedSupplierId + '/imports',
        file,
        selectedSupplierId
      );
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) ||
        data?.error ||
        data?.message ||
        data?.logs ||
        e?.message ||
        'Errore durante lo scraping delle offerte';
      setError(status ? `HTTP ${status}: ${backendMessage}` : backendMessage);
    } finally {
      setUploading(false);
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
      await loadProducts(buildCatalogQueryParams());
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

  const handleExportMagento = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSyncingMagento(true);
    setError('');
    try {
      const response = await apiClient.post('/products/export/magento', null, { signal: controller.signal });
      const d = response.data;
      const created = d.created ?? 0;
      const updated = d.updated ?? 0;
      const skipped = d.skipped ?? 0;
      const imagesUploaded = d.imagesUploaded ?? 0;
      const errs = d.errorsBySku ?? {};
      const errCount = Object.keys(errs).length;
      let msg = `Magento: ${created} creati, ${updated} aggiornati, ${skipped} saltati, ${imagesUploaded} immagini caricate`;
      if (errCount > 0) {
        msg += `, ${errCount} errori (vedi console)`;
        console.warn('Errori Magento per SKU:', errs);
      }
      alert(msg);
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
      const data = e?.response?.data;
      const errMsg = data?.error ?? data?.hint ?? e?.message ?? 'Errore durante l\'esportazione su Magento';
      setError(errMsg);
    } finally {
      abortControllerRef.current = null;
      setSyncingMagento(false);
    }
  };

  const handleSyncMagentoCategories = async () => {
    if (
      !window.confirm(
        'Aggiornare le categorie su Magento in base al catalogo virtuale?\n\n' +
          'Per ogni prodotto già presente su Magento: rimuove le assegnazioni alle categorie mappate non corrette e assegna la categoria corrispondente a quella attuale nel gestionale.\n' +
          'Non crea prodotti né modifica prezzi o descrizioni.'
      )
    ) {
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSyncingMagentoCategories(true);
    setError('');
    try {
      const response = await apiClient.post('/products/export/magento/categories', null, { signal: controller.signal });
      const d = response.data;
      const updated = d.updated ?? 0;
      const unchanged = d.unchanged ?? 0;
      const skipSku = d.skippedNoSku ?? 0;
      const skipM = d.skippedNotOnMagento ?? 0;
      const errs = d.errorsBySku ?? {};
      const errCount = Object.keys(errs).length;
      let msg = `Magento categorie: ${updated} aggiornati, ${unchanged} già allineati`;
      msg += `; ${skipM} non presenti su Magento, ${skipSku} senza SKU`;
      if (errCount > 0) {
        msg += `, ${errCount} errori (vedi console)`;
        console.warn('Errori sync categorie Magento:', errs);
      }
      alert(msg);
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
      const data = e?.response?.data;
      const errMsg =
        data?.error ?? data?.hint ?? e?.message ?? 'Errore aggiornamento categorie Magento';
      setError(errMsg);
    } finally {
      abortControllerRef.current = null;
      setSyncingMagentoCategories(false);
    }
  };

  const handleExportMagentoCurrentCategory = async () => {
    if (!selectedMagentoCategoryId) {
      setError('Seleziona una categoria da esportare su Magento.');
      return;
    }
    const selectedCategory = categories.find(
      (c) => String(c.id) === String(selectedMagentoCategoryId)
    );
    const categoryLabel = selectedCategory?.nome || 'categoria selezionata';
    if (
      !window.confirm(
        `Sincronizzare su Magento tutti i prodotti della categoria "${categoryLabel}"?\n\n` +
          'Per ogni prodotto: se esiste su Magento viene aggiornato, altrimenti viene creato.'
      )
    ) {
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSyncingMagentoCurrentCategory(true);
    setError('');
    try {
      const response = await apiClient.post(
        `/products/export/magento/category/${selectedMagentoCategoryId}`,
        null,
        { signal: controller.signal }
      );
      const d = response.data || {};
      const created = d.created ?? 0;
      const updated = d.updated ?? 0;
      const skipped = d.skipped ?? 0;
      const imagesUploaded = d.imagesUploaded ?? 0;
      const processed = d.productsProcessed ?? 0;
      const errs = d.errorsBySku ?? {};
      const errCount = Object.keys(errs).length;
      let msg = `Magento categoria "${d.categoryName || categoryLabel}": ${processed} prodotti, ${created} creati, ${updated} aggiornati, ${skipped} saltati, ${imagesUploaded} immagini caricate`;
      if (errCount > 0) {
        msg += `, ${errCount} errori (vedi console)`;
        console.warn('Errori Magento categoria per SKU:', errs);
      }
      alert(msg);
      setShowMagentoCategoryModal(false);
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
        return;
      }
      const data = e?.response?.data;
      const errMsg =
        data?.error ?? data?.hint ?? e?.message ?? 'Errore durante l\'esportazione categoria su Magento';
      setError(errMsg);
    } finally {
      abortControllerRef.current = null;
      setSyncingMagentoCurrentCategory(false);
    }
  };

  // eslint-disable-next-line no-unused-vars -- stub per evitare no-undef (referenza residua)
  const loadProductRevisions = async () => {};

  const openRevisionsModal = async () => {
    setShowRevisionsModal(true);
    setLoadingAllRevisions(true);
    setAllProductRevisions([]);
    try {
      const res = await apiClient.get('/products/all-revisions');
      setAllProductRevisions(Array.isArray(res.data) ? res.data : []);
    } catch (_) {
      setAllProductRevisions([]);
    } finally {
      setLoadingAllRevisions(false);
    }
  };

  const handleRevertProduct = async (productId, revisionId, closeModal) => {
    if (!productId || !revisionId) return;
    if (!window.confirm('Vuoi ripristinare il prodotto allo stato di questa modifica? I dati attuali verranno sovrascritti.')) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      const res = await apiClient.post(`/products/${productId}/revert/${revisionId}`);
      const reverted = res.data;
      const isOrphanDelete = reverted?.revisionDeleted === true && !reverted?.id;
      if (!isOrphanDelete && reverted?.id) {
        const spb = reverted.prezzoBase;
        setSelectedProduct(reverted);
        setProductForm({
          nome: reverted.nome || '',
          descrizione: reverted.descrizione || '',
          marca: reverted.marca || '',
          codiceProduttore: reverted.codiceProduttore || '',
          prezzoBase: spb != null && spb !== '' ? String(spb) : '',
          aumentoPercentuale: reverted.aumentoPercentuale ?? '',
          categoriaId: reverted.categoria ? reverted.categoria.id : '',
          disponibilita: reverted.disponibilita ?? '',
          ean: reverted.ean ?? '',
        });
      }
      await loadProducts();
      if (closeModal && showRevisionsModal) {
        setAllProductRevisions((prev) => prev.filter((r) => r.id !== revisionId));
      }
    } catch (e) {
      const data = e?.response?.data;
      const msg = (typeof data === 'string' && data) || data?.message || data?.error || data?.detail;
      setError(msg ? `Errore nel ripristino: ${msg}` : 'Errore nel ripristino del prodotto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleProductRowClick = (product) => {
    setSelectedProduct(product);
    const pb = isOffertaContext && product.prezzoOfferta != null ? product.prezzoOfferta : product.prezzoBase;
    setProductForm({
      nome: product.nome || '',
      descrizione: product.descrizione || '',
      disponibilita: product.disponibilita ?? '',
      ean: formatEan(product) !== 'EAN non disponibile' ? (product.ean || '') : '',
      marca: product.marca || '',
      codiceProduttore: product.codiceProduttore || '',
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

  const handleManualProductFormChange = (e) => {
    const { name, value } = e.target;
    setManualProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleManualProductForm = () => {
    setSelectedProduct(null);
    setShowManualProductForm((v) => {
      const next = !v;
      const fallbackCategoryName = activeCategoryPage || NEW_PRODUCTS_CATEGORY_NAME;
      const forcedId = getCategoryIdByName(fallbackCategoryName);
      if (next && forcedId) {
        setManualProductForm((prev) => ({ ...prev, categoriaId: String(forcedId) }));
      }
      return next;
    });
  };

  const handleOpenManualProductFormForCategory = async (categoryName) => {
    setSelectedProduct(null);
    setShowManualProductForm(true);
    const id = getCategoryIdByName(categoryName);
    if (id) {
      setManualProductForm((prev) => ({ ...prev, categoriaId: String(id) }));
    }
  };

  const handleManualProductCreate = async (e) => {
    e.preventDefault();
    if (creatingProduct) return;
    setCreatingProduct(true);
    setError('');
    try {
      const sku = String(manualProductForm.sku ?? '').trim();
      const nome = String(manualProductForm.nome ?? '').trim();
      if (!sku || !nome) {
        setError('SKU e Nome sono obbligatori per creare un prodotto manualmente.');
        return;
      }
      if (sku.toUpperCase().startsWith('EAN-')) {
        setError('SKU non valido: non usare prefissi "EAN-". Inserisci uno SKU reale.');
        return;
      }

      const parsePrezzo = (v) => {
        if (v === '' || v == null || v === undefined) return null;
        const s = String(v).trim().replace(',', '.');
        if (!s) return null;
        const n = parseFloat(s);
        return Number.isNaN(n) ? null : n;
      };

      const prezzoBaseVal = parsePrezzo(manualProductForm.prezzoBase);
      const aumentoVal = (() => {
        if (manualProductForm.aumentoPercentuale === '' || manualProductForm.aumentoPercentuale == null) return null;
        const n = Number(manualProductForm.aumentoPercentuale);
        return Number.isNaN(n) ? null : n;
      })();

      const categoriaIdNum = manualProductForm.categoriaId ? Number(manualProductForm.categoriaId) : null;

      const payload = {
        sku,
        nome,
        descrizione: String(manualProductForm.descrizione ?? '').trim() || null,
        disponibilita: String(manualProductForm.disponibilita ?? '').trim() || null,
        ean: String(manualProductForm.ean ?? '').trim() || null,
        marca: String(manualProductForm.marca ?? '').trim() || null,
        codiceProduttore: String(manualProductForm.codiceProduttore ?? '').trim() || null,
        prezzoBase: prezzoBaseVal,
        aumentoPercentuale: aumentoVal,
        categoria: categoriaIdNum && !Number.isNaN(categoriaIdNum) ? { id: categoriaIdNum } : null,
      };

      const response = await apiClient.post('/products', payload);
      const created = response.data;

      // Il backend imposta un flag per far comparire il prodotto anche in "Nuovi prodotti",
      // quindi mostriamo subito la pagina coerente in UI.
      await loadCategories();
      await applyCategoryPage(NEW_PRODUCTS_CATEGORY_NAME);
      setSelectedProduct(created);
      setShowManualProductForm(false);

      const spb = created.prezzoBase;
      setProductForm({
        nome: created.nome || '',
        descrizione: created.descrizione || '',
        marca: created.marca || '',
        codiceProduttore: created.codiceProduttore || '',
        prezzoBase: spb != null && spb !== '' ? String(spb) : '',
        aumentoPercentuale: created.aumentoPercentuale ?? '',
        categoriaId: created.categoria ? created.categoria.id : '',
        disponibilita: created.disponibilita ?? '',
        ean: formatEan(created) !== 'EAN non disponibile' ? (created.ean || '') : '',
      });

      // Manteniamo la categoria attiva per creare velocemente altri prodotti.
      setManualProductForm((prev) => ({
        ...prev,
        sku: '',
        nome: '',
        descrizione: '',
        disponibilita: '',
        ean: '',
        marca: '',
        codiceProduttore: '',
        prezzoBase: '',
        aumentoPercentuale: '',
        categoriaId: created.categoria ? String(created.categoria.id) : prev.categoriaId,
      }));
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) || data?.message || data?.error || data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(details ? `Errore nella creazione del prodotto (${details})` : 'Errore nella creazione del prodotto');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleProductSave = async (e) => {
    e?.preventDefault?.();
    if (!selectedProduct) return false;
    if (savingProductRef.current) return false;
    savingProductRef.current = true;
    setSavingProduct(true);
    setError('');
    try {
      const form = e?.target ?? null;
      const elPrezzo = form?.elements?.prezzoBase ?? form?.querySelector?.('[name="prezzoBase"]');
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
        nome: form?.nome?.value ?? productForm.nome ?? selectedProduct.nome,
        descrizione: form?.descrizione?.value ?? productForm.descrizione ?? selectedProduct.descrizione,
        disponibilita: (form?.disponibilita?.value ?? productForm.disponibilita ?? selectedProduct.disponibilita) || null,
        ean: (form?.ean?.value ?? productForm.ean ?? selectedProduct.ean)?.trim() || null,
        marca: (form?.marca?.value ?? productForm.marca ?? selectedProduct.marca)?.trim() || null,
        codiceProduttore: (form?.codiceProduttore?.value ?? productForm.codiceProduttore ?? selectedProduct.codiceProduttore)?.trim() || null,
        prezzoBase: isOffertaContext ? (selectedProduct.prezzoBase ?? null) : prezzoBaseVal,
        prezzoOfferta: isOffertaContext ? prezzoBaseVal : (selectedProduct.prezzoOfferta ?? null),
        aumentoPercentuale: (() => {
          const v = form?.aumentoPercentuale?.value ?? productForm.aumentoPercentuale ?? selectedProduct.aumentoPercentuale;
          return v === '' || v == null ? null : Number(v);
        })(),
        categoriaId: (() => {
          const v = form?.categoriaId?.value ?? productForm.categoriaId ?? selectedProduct.categoria?.id;
          return v && v !== '' ? (typeof v === 'number' ? v : Number(v)) : null;
        })(),
      };
      const response = await apiClient.put(`/products/${selectedProduct.id}`, payload);
      const savedProduct = response.data;
      const categoryChanged =
        (savedProduct.categoria?.id ?? null) !==
        (selectedProduct.categoria?.id ?? null);
      const params = buildCatalogQueryParams();
      if (categoryChanged) {
        const newCategory = (savedProduct.categoria?.nome || '').trim();
        if (newCategory) {
          params.categoria = newCategory;
          setActiveCategoryPage(newCategory);
        } else {
          delete params.categoria;
          setActiveCategoryPage('');
        }
        setFilters((prev) => ({ ...prev, categoria: '' }));
      }
      await loadProducts(params);
      setSelectedProduct(savedProduct);
      const spb = isOffertaContext && savedProduct.prezzoOfferta != null
        ? savedProduct.prezzoOfferta
        : savedProduct.prezzoBase;
      setProductForm({
        nome: savedProduct.nome || '',
        descrizione: savedProduct.descrizione || '',
        disponibilita: savedProduct.disponibilita ?? '',
        ean: savedProduct.ean ?? '',
        marca: savedProduct.marca || '',
        codiceProduttore: savedProduct.codiceProduttore || '',
        prezzoBase: spb != null && spb !== '' ? String(spb) : '',
        aumentoPercentuale: savedProduct.aumentoPercentuale ?? '',
        categoriaId: savedProduct.categoria ? savedProduct.categoria.id : '',
      });
      if (showRevisionsModal) {
        try {
          const revRes = await apiClient.get('/products/all-revisions');
          setAllProductRevisions(Array.isArray(revRes.data) ? revRes.data : []);
        } catch (_) { /* ignore */ }
      }
      return true;
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) || data?.message || data?.error || data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(details ? `Errore nel salvataggio del prodotto (${details})` : 'Errore nel salvataggio del prodotto');
      return false;
    } finally {
      savingProductRef.current = false;
      setSavingProduct(false);
    }
  };

  const handleInlineCategoryChange = async (product, nextCategoriaIdRaw, useProductFormValues = false) => {
    if (!product?.id) return;
    if (savingProductRef.current) return;

    const isCurrentSelected = selectedProduct?.id != null && String(selectedProduct.id) === String(product.id);

    const nextCategoriaId =
      nextCategoriaIdRaw != null && String(nextCategoriaIdRaw) !== ''
        ? Number(nextCategoriaIdRaw)
        : null;
    const nextCategoriaIdSafe =
      nextCategoriaId != null && Number.isNaN(nextCategoriaId) ? null : nextCategoriaId;

    savingProductRef.current = true;
    setSavingProduct(true);
    setError('');
    try {
      // In `ProductUpdateRequest` i campi vengono applicati così come arrivano:
      // per non azzerare valori, inviamo anche i dati già presenti (da `product` o da `productForm` se stiamo editando).
      const source = useProductFormValues ? productForm : product;
      const emptyToNull = (v) => (v === '' || v == null ? null : v);
      const parsePercentOrNull = (v) => {
        if (v == null || v === '') return null;
        if (typeof v === 'number') return v;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      };
      const payload = {
        nome: emptyToNull(source.nome),
        descrizione: emptyToNull(source.descrizione),
        disponibilita: emptyToNull(source.disponibilita),
        ean: emptyToNull(source.ean),
        marca: emptyToNull(source.marca),
        codiceProduttore: emptyToNull(source.codiceProduttore),
        prezzoBase: isOffertaContext && useProductFormValues ? emptyToNull(product.prezzoBase) : emptyToNull(source.prezzoBase),
        prezzoOfferta: isOffertaContext && useProductFormValues ? emptyToNull(source.prezzoBase) : emptyToNull(product.prezzoOfferta),
        aumentoPercentuale: parsePercentOrNull(source.aumentoPercentuale),
        categoriaId: nextCategoriaIdSafe,
      };

      const response = await apiClient.put(`/products/${product.id}`, payload);
      const savedProduct = response.data;

      const categoryChanged =
        (savedProduct.categoria?.id ?? null) !== (product.categoria?.id ?? null);

      setSelectedProduct((prev) => (prev?.id === product.id ? savedProduct : prev));

      if (isCurrentSelected) {
        const spb = isOffertaContext && savedProduct.prezzoOfferta != null
          ? savedProduct.prezzoOfferta
          : savedProduct.prezzoBase;
        setProductForm({
          nome: savedProduct.nome || '',
          descrizione: savedProduct.descrizione || '',
          marca: savedProduct.marca || '',
          codiceProduttore: savedProduct.codiceProduttore || '',
          prezzoBase: spb != null && spb !== '' ? String(spb) : '',
          aumentoPercentuale: savedProduct.aumentoPercentuale ?? '',
          categoriaId: savedProduct.categoria ? savedProduct.categoria.id : '',
          disponibilita: savedProduct.disponibilita ?? '',
          ean: savedProduct.ean ?? '',
        });
      }

      const params = buildCatalogQueryParams();
      if (categoryChanged) {
        const newCategoryName = (savedProduct.categoria?.nome || '').trim();
        if (newCategoryName) {
          params.categoria = newCategoryName;
          setActiveCategoryPage(newCategoryName);
        } else {
          delete params.categoria;
          setActiveCategoryPage('');
        }
        setFilters((prev) => ({ ...prev, categoria: '' }));
      }

      await loadProducts(params);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) || data?.message || data?.error || data?.detail;
      const details = [
        status ? `HTTP ${status}` : null,
        backendMessage ? String(backendMessage) : null,
      ]
        .filter(Boolean)
        .join(' - ');
      setError(details ? `Errore nel cambio categoria (${details})` : 'Errore nel cambio categoria');
    } finally {
      savingProductRef.current = false;
      setSavingProduct(false);
    }
  };

  const handleProductDelete = async (productId) => {
    if (!productId) return;
    const activeVirtualNuovi =
      String(filters.categoria || activeCategoryPage || '').trim().toLowerCase() ===
      String(NEW_PRODUCTS_CATEGORY_NAME).trim().toLowerCase();
    const activeVirtualOfferta =
      String(filters.categoria || activeCategoryPage || '').trim().toLowerCase() ===
      String(OFFERTA_CATEGORY_NAME).trim().toLowerCase();
    const confirmMessage = activeVirtualNuovi
      ? 'Vuoi rimuovere questo prodotto da "Nuovi prodotti"? Il prodotto resterà nella sua categoria principale.'
      : activeVirtualOfferta
        ? 'Vuoi rimuovere questo prodotto da "In offerta"? Il prodotto resterà nella sua categoria principale.'
        : 'Vuoi cancellare questo prodotto dal catalogo?';
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      if (activeVirtualNuovi) {
        await apiClient.post(`/products/${productId}/remove-nuovi-prodotti`);
      } else if (activeVirtualOfferta) {
        await apiClient.post(`/products/${productId}/remove-offerta`);
      } else {
        await apiClient.delete(`/products/${productId}`);
      }
      setSelectedProduct(null);
      await loadProducts(buildCatalogQueryParams());
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
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSyncingIcecat(true);
    setError('');
    try {
      const res = await apiClient.post(`/products/${productId}/sync-icecat-images`, null, { signal: controller.signal });
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
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
      } else {
        setError('Errore durante il recupero immagini da Icecat.');
      }
    } finally {
      abortControllerRef.current = null;
      setSyncingIcecat(false);
    }
  };

  const handleSyncSingleProductToMagento = async (productId) => {
    if (!productId) return;
    if (syncingMagentoSingle) return;
    setSyncingMagentoSingle(true);
    setError('');
    try {
      // Prima persiste eventuali modifiche correnti del form, poi synca su Magento.
      if (selectedProduct?.id === productId) {
        const saved = await handleProductSave({ preventDefault: () => {}, target: null });
        if (!saved) return;
      }
      const response = await apiClient.post(`/products/${productId}/export/magento`);
      const stats = response?.data || {};
      const created = Number(stats.created || 0);
      const updated = Number(stats.updated || 0);
      const imagesUploaded = Number(stats.imagesUploaded || 0);
      const hasErrors = stats.errorsBySku && Object.keys(stats.errorsBySku).length > 0;
      if (hasErrors) {
        setError('Sync Magento completata con errori per questo prodotto.');
      } else {
        const msg = `Magento aggiornato (creati: ${created}, aggiornati: ${updated}, immagini: ${imagesUploaded}).`;
        setError(msg);
        setTimeout(() => setError(''), 4000);
      }
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendMessage =
        (typeof data === 'string' && data) || data?.message || data?.error || data?.detail;
      const details = [status ? `HTTP ${status}` : null, backendMessage ? String(backendMessage) : null]
        .filter(Boolean)
        .join(' - ');
      setError(details ? `Errore sync Magento (${details})` : 'Errore sync Magento per questo prodotto.');
    } finally {
      setSyncingMagentoSingle(false);
    }
  };

  const handleSetDocumentAsMain = async (productId, documentId) => {
    if (!productId || !documentId) return;
    setError('');
    try {
      await apiClient.put(`/products/${productId}/documents/${documentId}/set-as-main`);
      await loadProducts();
      if (selectedProduct?.id === productId) {
        const allRes = await apiClient.get('/products');
        const p = allRes.data?.find((x) => x.id === productId);
        if (p) setSelectedProduct(p);
      }
    } catch (e) {
      setError('Errore nell\'impostazione dell\'immagine principale.');
    }
  };

  const handleAddDocumentFromUrl = async (productId) => {
    if (!productId || !manualImageFile) return;
    setAddingDocument(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', manualImageFile);
      const descrizione = String(productForm?.descrizione ?? '').trim();
      if (descrizione) {
        formData.append('descrizione', descrizione);
      }
      await apiClient.post(`/products/${productId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setManualImageFile(null);
      await loadProducts();
      if (selectedProduct?.id === productId) {
        const allRes = await apiClient.get('/products');
        const p = allRes.data?.find((x) => x.id === productId);
        if (p) setSelectedProduct(p);
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
          ? `Errore nel caricamento dell'immagine (${details})`
          : 'Errore nel caricamento dell\'immagine'
      );
    } finally {
      setAddingDocument(false);
    }
  };

  const handleDeleteDocument = async (productId, documentId) => {
    if (!productId || !documentId) return;
    setError('');
    try {
      await apiClient.delete(`/products/${productId}/documents/${documentId}`);
      await loadProducts();
      if (selectedProduct?.id === productId) {
        const allRes = await apiClient.get('/products');
        const p = allRes.data?.find((x) => x.id === productId);
        if (p) setSelectedProduct(p);
      }
    } catch (e) {
      setError('Errore nella rimozione del documento.');
    }
  };

  /** Restituisce la prima immagine dai documenti, ordinata per ordine (0 = principale). */
  const getMainImageDoc = (documenti) => {
    if (!documenti || documenti.length === 0) return null;
    const images = documenti.filter((d) => {
      const tipo = (d.tipo || '').toLowerCase();
      return (
        tipo === 'immagine' ||
        tipo === 'image' ||
        tipo === 'immagine_manual' ||
        tipo.startsWith('immagine')
      );
    });
    if (images.length === 0) return null;
    const sorted = [...images].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));
    return sorted[0];
  };

  const handleSyncAllIcecatImages = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSyncingIcecat(true);
    setError('');
    try {
      const res = await apiClient.post('/products/sync-all-icecat-images', null, { signal: controller.signal });
      const added = res?.data?.imagesAdded ?? 0;
      await loadProducts();
      if (selectedProduct) {
        const allRes = await apiClient.get('/products');
        const p = allRes.data?.find((x) => x.id === selectedProduct.id);
        if (p) setSelectedProduct(p);
      }
      setError(added > 0 ? '' : 'Nessuna immagine trovata su Icecat per i prodotti con EAN valido.');
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
        setCancelMessage();
      } else {
        setError('Errore durante il recupero immagini da Icecat.');
      }
    } finally {
      abortControllerRef.current = null;
      setSyncingIcecat(false);
    }
  };

  const handleCatalogReset = async () => {
    if (
      !window.confirm(
        'ATTENZIONE: verranno cancellati tutti i prodotti tranne quelli in "Nuovi prodotti" (le categorie restano). Vuoi continuare?'
      )
    ) {
      return;
    }
    setSavingProduct(true);
    setError('');
    try {
      // Passo critico: reset del catalogo
      await apiClient.delete('/products/reset');
      setSelectedProduct(null);
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
      setSavingProduct(false);
      return;
    }

    // Se il reset è andato a buon fine, eventuali errori nel ricarico non devono far pensare che il reset sia fallito
    try {
      await loadProducts();
      await loadCategories();

      // Se la modale di rollback era aperta, dopo reset deve sparire qualsiasi lista vecchia.
      setShowRollbackSelectModal(false);
      setAppliedImportsForRollback([]);
      setLoadingAppliedImportsForRollback(false);
    } catch (e) {
      // Mostriamo al massimo un errore soft di ricaricamento
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
      if (details) {
        setError(`Reset completato, ma errore nel ricaricare i dati (${details})`);
      }
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

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthOk(false);
    setError('');
  };

  const openFullscreenImage = (src, alt = '') => {
    setFullscreenImage({ src, alt });
  };

  const closeFullscreenImage = () => {
    setFullscreenImage(null);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeFullscreenImage();
    };
    if (fullscreenImage) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [fullscreenImage]);

  const toggleCatalogFullscreen = async () => {
    try {
      if (catalogFullscreen) {
        if (document.exitFullscreen) await document.exitFullscreen();
      } else {
        setCatalogFullscreen(true);
      }
    } catch (err) {
      setError('Fullscreen non supportato dal browser');
    }
  };

  useEffect(() => {
    const el = document.createElement('div');
    el.id = 'catalog-fullscreen-portal';
    document.body.appendChild(el);
    setFullscreenPortalRoot(el);
    return () => {
      if (document.body.contains(el)) document.body.removeChild(el);
    };
  }, []);

  useEffect(() => {
    if (!catalogFullscreen || !fullscreenPortalRoot) return;
    const t = setTimeout(() => {
      if (fullscreenPortalRef.current && !document.fullscreenElement) {
        fullscreenPortalRef.current.requestFullscreen?.();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [catalogFullscreen, fullscreenPortalRoot]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setCatalogFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!authOk) {
    return (
      <LoginScreen
        onLogin={(username, password) => {
          const ok = String(username ?? '').trim() === LOGIN_USERNAME && String(password ?? '') === LOGIN_PASSWORD;
          if (ok) {
            localStorage.setItem(AUTH_STORAGE_KEY, '1');
            setAuthOk(true);
          }
          return ok;
        }}
      />
    );
  }

  return (
    <div className="App">
      {showMagentoCategoryModal && (
        <div
          className="fullscreen-image-overlay"
          style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowMagentoCategoryModal(false)}
          role="button"
          tabIndex={-1}
          aria-label="Chiudi"
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Esporta categoria su Magento</h3>
              <button type="button" className="icon-button" onClick={() => setShowMagentoCategoryModal(false)} aria-label="Chiudi">
                ✕
              </button>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Scegli la categoria da esportare. I prodotti esistenti su Magento vengono aggiornati, i mancanti vengono creati.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <select
                value={selectedMagentoCategoryId}
                onChange={(e) => setSelectedMagentoCategoryId(e.target.value)}
                disabled={syncingMagentoCurrentCategory}
              >
                <option value="">Seleziona categoria...</option>
                {sortedCategories.map((c) => (
                  <option key={`magento-cat-${c.id}`} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleExportMagentoCurrentCategory}
                  disabled={!selectedMagentoCategoryId || syncingMagentoCurrentCategory}
                >
                  {syncingMagentoCurrentCategory ? 'Esportazione...' : 'Esporta categoria su Magento'}
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  onClick={() => setShowMagentoCategoryModal(false)}
                  disabled={syncingMagentoCurrentCategory}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmptyCategoryModal && (
        <div
          className="fullscreen-image-overlay"
          style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => !emptyingCategory && setShowEmptyCategoryModal(false)}
          role="button"
          tabIndex={-1}
          aria-label="Chiudi"
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Svuota categoria</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => !emptyingCategory && setShowEmptyCategoryModal(false)}
                disabled={emptyingCategory}
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Scegli la categoria. Per le categorie reali i prodotti vanno nel cestino; per &quot;In offerta&quot; e
              &quot;Nuovi prodotti&quot; vengono aggiornati solo i flag virtuali.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <select
                value={selectedEmptyCategoryId}
                onChange={(e) => setSelectedEmptyCategoryId(e.target.value)}
                disabled={emptyingCategory}
              >
                <option value="">Seleziona categoria...</option>
                {sortedCategories.map((c) => (
                  <option key={`empty-cat-${c.id}`} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="danger-button" onClick={handleEmptyCategoryConfirm} disabled={!selectedEmptyCategoryId || emptyingCategory}>
                  {emptyingCategory ? 'Attendere...' : 'Svuota categoria'}
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  onClick={() => setShowEmptyCategoryModal(false)}
                  disabled={emptyingCategory}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRollbackSelectModal && (
        <div
          className="fullscreen-image-overlay"
          style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowRollbackSelectModal(false)}
          role="button"
          tabIndex={-1}
          aria-label="Chiudi"
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Scegli quale import annullare</h3>
              <button type="button" className="icon-button" onClick={() => setShowRollbackSelectModal(false)} aria-label="Chiudi">
                ✕
              </button>
            </div>
            {loadingAppliedImportsForRollback ? (
              <p className="muted">Caricamento...</p>
            ) : appliedImportsForRollback.length === 0 ? (
              <p className="muted">Nessun import applicato al catalogo.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Fornitore</th>
                      <th>Applicato il</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliedImportsForRollback.map((imp) => (
                      <tr key={`${imp.supplierId}-${imp.id}`}>
                        <td><strong>{imp.fileName}</strong></td>
                        <td>{imp.supplierName || '—'}</td>
                        <td>{imp.appliedAt ? new Date(imp.appliedAt).toLocaleString() : '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="icon-button icon-button-secondary"
                            title="Annulla questo import"
                            disabled={savingProduct}
                            onClick={() => handleRollbackSelectedImport(imp.supplierId, imp.id)}
                          >
                            ↩ Annulla
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showRevisionsModal && (
        <div
          className="fullscreen-image-overlay"
          style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowRevisionsModal(false)}
          role="button"
          tabIndex={-1}
          aria-label="Chiudi"
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Cronologia modifiche prodotti</h3>
              <button type="button" className="icon-button" onClick={() => setShowRevisionsModal(false)} aria-label="Chiudi">
                ✕
              </button>
            </div>
            {loadingAllRevisions ? (
              <p className="muted">Caricamento...</p>
            ) : allProductRevisions.length === 0 ? (
              <p className="muted">Nessuna modifica registrata. Le modifiche appaiono qui dopo aver salvato un prodotto.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Prodotto</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProductRevisions.map((rev) => {
                      const d = rev.createdAt ? new Date(rev.createdAt) : null;
                      const dateStr = d ? d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                      const nomeSnap = rev.nome || '(senza nome)';
                      return (
                        <tr key={rev.id}>
                          <td>{dateStr}</td>
                          <td>
                            {nomeSnap}
                            {rev.productId && <span className="muted" style={{ marginLeft: '0.25rem', fontSize: '0.85em' }}> (ID: {rev.productId})</span>}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-button icon-button-secondary"
                              title="Ripristina il prodotto a questa versione"
                              disabled={savingProduct || !rev.productId}
                              onClick={() => handleRevertProduct(rev.productId, rev.id, true)}
                            >
                              ↩ Annulla modifiche
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div
          className="fullscreen-image-overlay"
          onClick={closeFullscreenImage}
          role="button"
          tabIndex={-1}
          aria-label="Chiudi ingrandimento"
        >
          <button
            type="button"
            className="fullscreen-image-close"
            onClick={closeFullscreenImage}
            aria-label="Chiudi"
          >
            ✕
          </button>
          <img
            src={fullscreenImage.src}
            alt={fullscreenImage.alt}
            className="fullscreen-image-img"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-left">
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
          <div className="app-header-logo-right">
            <img
              src={process.env.PUBLIC_URL + '/logo%20160x160.webp'}
              alt="Logo"
              className="app-logo-160"
            />
          </div>
        </div>
      </header>

      <main className="app-main">
        {(uploading || syncingIcecat || syncingMagento || syncingMagentoCategories || syncingMagentoCurrentCategory || emptyingCategory) && (
          <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <span>
              {uploading
                ? 'Import in corso...'
                : emptyingCategory
                  ? 'Svuotamento categoria in corso...'
                  : syncingIcecat
                    ? 'Sincronizzazione Icecat in corso...'
                    : syncingMagentoCategories
                      ? 'Aggiornamento categorie Magento in corso...'
                      : syncingMagentoCurrentCategory
                        ? 'Sincronizzazione categoria Magento in corso...'
                        : syncingMagento
                          ? 'Sincronizzazione Magento in corso...'
                          : 'Operazione in corso...'}{' '}
              attendere il completamento.
            </span>
            <button
              type="button"
              className="danger-button"
              onClick={handleCancelOperation}
              title="Annulla l'operazione in corso"
            >
              Annulla
            </button>
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        <nav className="app-nav">
          <button
            type="button"
            className={activeNav === 'catalogo' ? 'app-nav-active' : ''}
            onClick={() => handleNavClick('catalogo')}
          >
            Catalogo virtuale{catalogProductCount != null ? ` (${catalogProductCount.toLocaleString('it-IT')})` : ''}
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
          <button
            type="button"
            className={activeNav === 'cestino' ? 'app-nav-active' : ''}
            onClick={() => handleNavClick('cestino')}
            title="Visualizza articoli eliminati"
          >
            Cestino
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
            title="Esci dalla sessione"
          >
            Logout
          </button>
        </nav>

        {activeNav === 'catalogo' && (
          <>
            <section className="card">
              <h2>Catalogo virtuale</h2>
              {catalogProductCount != null && (
                <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
                  Prodotti nel catalogo: <strong>{catalogProductCount.toLocaleString('it-IT')}</strong>
                </p>
              )}
              {bitplanetMessage && (
                <div className="alert alert-info" style={{ margin: '0.5rem 0 0.75rem 0' }}>
                  {bitplanetMessage}
                </div>
              )}

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
                    const catCount = catId != null ? (categoryCounts?.[catId] ?? 0) : 0;
                    return (
                      <div key={cat} className="category-legend-item">
                        <span className="category-legend-num">{idx + 1}</span>
                        <span className="category-legend-name">{cat} ({catCount})</span>
                        {catId != null && (
                          <button
                            type="button"
                            className="category-add-product-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenManualProductFormForCategory(cat);
                            }}
                            disabled={uploading || creatingProduct || deletingCategoryId != null}
                            title={`Aggiungi prodotto manualmente a "${cat}"`}
                            aria-label={`Aggiungi prodotto manualmente a "${cat}"`}
                          >
                            +
                          </button>
                        )}
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
                  placeholder="Categoria (opzionale)"
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
                {(filters.categoria || filters.fornitore || activeCategoryPage) && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const nextFilters = { ...filters, categoria: '', fornitore: '' };
                      setFilters(nextFilters);
                      setActiveCategoryPage('');
                      loadProducts(buildCatalogQueryParams(nextFilters, ''));
                    }}
                    disabled={loading || uploading}
                  >
                    Mostra tutte
                  </button>
                )}
              </form>

              {(() => {
                const catalogFSContent = (
                  <>
                <div className="catalog-header-row">
                  <h3>Prodotti</h3>
                  <button
                    type="button"
                    className="catalog-fullscreen-btn"
                    onClick={toggleCatalogFullscreen}
                    title={catalogFullscreen ? 'Esci da schermo intero' : 'Catalogo a schermo intero'}
                    aria-label={catalogFullscreen ? 'Esci da schermo intero' : 'Catalogo a schermo intero'}
                  >
                    {catalogFullscreen ? (
                      <>
                        <span className="catalog-fullscreen-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </span>
                        Esci da schermo intero
                      </>
                    ) : (
                      <>
                        <span className="catalog-fullscreen-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                          </svg>
                        </span>
                        Schermo intero
                      </>
                    )}
                  </button>
                </div>

                {/* In fullscreen con prodotto selezionato: pannello dettaglio a tutta altezza con X per chiudere */}
                {catalogFullscreen && selectedProduct ? (
                  <div className="catalog-fullscreen-detail">
                    <div className="catalog-fullscreen-detail-header">
                      <h3>Dettaglio prodotto</h3>
                      <button
                        type="button"
                        className="catalog-detail-close-btn"
                        onClick={() => setSelectedProduct(null)}
                        title="Chiudi e torna al catalogo"
                        aria-label="Chiudi e torna al catalogo"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="catalog-fullscreen-detail-body">
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.5rem 0 0.25rem 0' }}>
                        <button
                          type="button"
                          className=""
                          onClick={() => handleToggleOfferForSelectedProduct(selectedProduct)}
                          disabled={uploading || loading || togglingOffer}
                          title="Assegna o rimuovi questo prodotto dalle offerte"
                        >
                          {isProductInOffer(selectedProduct) ? 'Togli dalle offerte ✓' : 'Metti in offerte'}
                        </button>
                      </div>
                      <form className="product-form" onSubmit={handleProductSave}>
                        <label>Nome <input type="text" name="nome" value={productForm.nome} onChange={handleProductFormChange} /></label>
                        <label>Descrizione <textarea name="descrizione" rows="3" value={productForm.descrizione} onChange={handleProductFormChange} /></label>
                        <label>Disponibilità (CS) <input type="text" name="disponibilita" placeholder="Es. 10, 5+" value={productForm.disponibilita} onChange={handleProductFormChange} /></label>
                        <label>EAN <input type="text" name="ean" placeholder="Es. 8057284620150 (per Icecat)" value={productForm.ean} onChange={handleProductFormChange} /></label>
                        <label>Marca <input type="text" name="marca" placeholder="Es. VULTECH (per fallback Icecat)" value={productForm.marca} onChange={handleProductFormChange} /></label>
                        <label>Codice produttore <input type="text" name="codiceProduttore" placeholder="Es. GS-25U3 (per fallback Icecat)" value={productForm.codiceProduttore} onChange={handleProductFormChange} /></label>
                        <label>{isOffertaContext ? 'Prezzo offerta' : 'Prezzo base'} <input type="number" step="0.01" name="prezzoBase" value={productForm.prezzoBase ?? ''} onChange={handleProductFormChange} /></label>
                        <label>Aumento specifico prodotto (%) <input type="number" step="0.01" name="aumentoPercentuale" value={productForm.aumentoPercentuale} onChange={handleProductFormChange} /></label>
                        <label>
                          Categoria
                          <select
                            className="catalog-category-select"
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
                        <div className="product-form-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button type="submit" disabled={savingProduct || syncingMagentoSingle}>
                            {savingProduct ? 'Salvataggio...' : 'Salva modifiche'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={savingProduct || syncingMagentoSingle}
                            onClick={() => handleSyncSingleProductToMagento(selectedProduct.id)}
                            title="Aggiorna solo questo prodotto su Magento"
                          >
                            {syncingMagentoSingle ? 'Sync Magento...' : 'Aggiorna su Magento'}
                          </button>
                        </div>
                      </form>
                      <div className="product-documents">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0 }}>Documenti associati</h4>
                          <button type="button" className="icon-button icon-button-secondary" title={`Scarica immagini da Icecat (EAN: ${formatEan(selectedProduct)})`} onClick={() => handleSyncIcecatImages(selectedProduct.id)} disabled={syncingIcecat}>{syncingIcecat ? '...' : '📷 Icecat'}</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files && e.target.files[0]; setManualImageFile(file || null); }} />
                            <button type="button" className="icon-button icon-button-secondary" onClick={() => handleAddDocumentFromUrl(selectedProduct.id)} disabled={addingDocument || !manualImageFile} title="Carica un'immagine dal PC">{addingDocument ? 'Caricamento...' : 'Carica immagine'}</button>
                          </div>
                          <span className="muted" style={{ fontSize: '0.75rem' }}>Usa questo campo se Icecat non trova l&apos;immagine o se quella trovata è sbagliata. L&apos;immagine viene salvata localmente.</span>
                        </div>
                        {selectedProduct.documenti && selectedProduct.documenti.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {[...selectedProduct.documenti].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999)).map((d) => {
                              const url = d.url || d.urlDocumento;
                              const imgSrc = url?.startsWith('/') ? (API_ORIGIN + url) : (url?.includes('icecat') || url?.startsWith('http') ? `${API_BASE}/images/proxy?url=${encodeURIComponent(url)}` : url);
                              const tipo = (d.tipo || '').toLowerCase();
                              const isImg =
                                tipo === 'immagine' ||
                                tipo === 'image' ||
                                tipo === 'immagine_manual' ||
                                tipo.startsWith('immagine');
                              const isMain = isImg && ((d.ordine ?? 999) === 0);
                              return (
                                <li key={d.id || `${d.tipo}-${url}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: isMain ? '#fff5f5' : '#f9fafb', border: isMain ? '2px solid #dc2626' : '1px solid #e5e7eb', borderRadius: 8, minWidth: 140 }}>
                                  {isImg && imgSrc ? (<div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, overflow: 'hidden' }}><img src={imgSrc} alt="Anteprima" style={{ maxWidth: 140, maxHeight: 140, width: 'auto', height: 'auto', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} /></div>) : null}
                                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{d.tipoDocumento || d.tipo}{isMain ? ' · Principale' : ''}</span>
                                  {isImg && (<button type="button" className="icon-button icon-button-secondary" title="Imposta come immagine principale" disabled={isMain} onClick={() => handleSetDocumentAsMain(selectedProduct.id, d.id)}>{isMain ? '✓ Principale' : 'Imposta principale'}</button>)}
                                  {d.id && (<button type="button" className="icon-button icon-button-danger" title="Rimuovi documento" onClick={() => handleDeleteDocument(selectedProduct.id, d.id)}>🗑️</button>)}
                                  {!isImg && url && <a href={url?.startsWith('/') ? API_ORIGIN + url : url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>{url}</a>}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (<p className="muted">Nessun documento associato. Clicca &quot;📷 Icecat&quot; per scaricare le immagini automaticamente.</p>)}
                      </div>
                    </div>
                  </div>
                ) : (
                <div className={`products-layout ${catalogFullscreen ? 'products-layout-fullscreen-only' : ''}`}>
                <div className="table-wrapper" ref={catalogTableRef}>
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
                        <th>{isOffertaContext ? 'Prezzo offerta' : 'Prezzo base'}</th>
                        <th>Prezzo finale</th>
                        <th>Descrizione</th>
                        <th>Image</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 && (
                        <tr>
                          <td colSpan="13">
                            {filters.nome || filters.sku || filters.ean || filters.fornitore
                              ? 'Nessun prodotto con i filtri attuali (svuota Nome, SKU, EAN o Fornitore e premi Cerca).'
                              : 'Nessun prodotto trovato'}
                          </td>
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
                            {formatPrezzo(getDisplayedBasePrice(p))}
                          </td>
                          <td>
                            {formatPrezzo(
                              isOffertaContext
                                ? (p?.prezzoOfferta != null ? p.prezzoOfferta : p?.prezzoFinale)
                                : computeBaseFinalPriceForDisplay(p)
                            )}
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
                              const doc = getMainImageDoc(p.documenti);
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
                                  className="catalog-img catalog-img-zoom"
                                  src={src}
                                  alt={p.nome || ''}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFullscreenImage(src, p.nome || '');
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  title="Clicca per ingrandire a schermo intero"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openFullscreenImage(src, p.nome || '');
                                    }
                                  }}
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

                {!catalogFullscreen && (
                <div className="product-detail">
                  <h3>Dettaglio / modifica prodotto</h3>
                  {!selectedProduct && (
                    <>
                      <p className="muted">
                        Seleziona una riga dalla tabella per modificare il prodotto oppure aggiungine uno manualmente.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.5rem 0 0.25rem 0' }}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={handleToggleManualProductForm}
                          disabled={uploading || loading || creatingProduct}
                          title="Apri / chiudi il form di creazione prodotto manuale"
                        >
                          {showManualProductForm ? 'Chiudi form' : '＋ Aggiungi prodotto manualmente'}
                        </button>
                      </div>
                      {showManualProductForm && (
                        <form className="product-form" onSubmit={handleManualProductCreate}>
                          <label>
                            SKU (obbligatorio)
                            <input
                              type="text"
                              name="sku"
                              value={manualProductForm.sku}
                              onChange={handleManualProductFormChange}
                              placeholder="Es. GS-25U3"
                            />
                          </label>
                          <label>
                            Nome (obbligatorio)
                            <input
                              type="text"
                              name="nome"
                              value={manualProductForm.nome}
                              onChange={handleManualProductFormChange}
                              placeholder="Nome prodotto"
                            />
                          </label>
                          <label>
                            Descrizione
                            <textarea
                              name="descrizione"
                              rows="3"
                              value={manualProductForm.descrizione}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            Disponibilità (CS)
                            <input
                              type="text"
                              name="disponibilita"
                              placeholder="Es. 10, 5+"
                              value={manualProductForm.disponibilita}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            EAN
                            <input
                              type="text"
                              name="ean"
                              placeholder="Es. 8057284620150 (per Icecat)"
                              value={manualProductForm.ean}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            Marca
                            <input
                              type="text"
                              name="marca"
                              placeholder="Es. VULTECH (per fallback Icecat)"
                              value={manualProductForm.marca}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            Codice produttore
                            <input
                              type="text"
                              name="codiceProduttore"
                              placeholder="Es. GS-25U3 (per fallback Icecat)"
                              value={manualProductForm.codiceProduttore}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            {isOffertaContext ? 'Prezzo offerta' : 'Prezzo base'}
                            <input
                              type="number"
                              step="0.01"
                              name="prezzoBase"
                              value={manualProductForm.prezzoBase ?? ''}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            Aumento specifico prodotto (%)
                            <input
                              type="number"
                              step="0.01"
                              name="aumentoPercentuale"
                              value={manualProductForm.aumentoPercentuale ?? ''}
                              onChange={handleManualProductFormChange}
                            />
                          </label>
                          <label>
                            Categoria
                            <select
                              name="categoriaId"
                              value={manualProductForm.categoriaId}
                              onChange={handleManualProductFormChange}
                            >
                              <option value="">Nessuna</option>
                              {sortedCategories.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="product-form-actions">
                            <button type="submit" disabled={creatingProduct}>
                              {creatingProduct ? 'Creazione...' : 'Crea prodotto'}
                            </button>
                          </div>
                        </form>
                      )}
                    </>
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.5rem 0 0.25rem 0' }}>
                        <button
                          type="button"
                          className=""
                          onClick={() => handleToggleOfferForSelectedProduct(selectedProduct)}
                          disabled={uploading || loading || togglingOffer}
                          title="Assegna o rimuovi questo prodotto dalle offerte"
                        >
                          {isProductInOffer(selectedProduct) ? 'Togli dalle offerte ✓' : 'Metti in offerte'}
                        </button>
                      </div>
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
                          Marca
                          <input
                            type="text"
                            name="marca"
                            placeholder="Es. VULTECH (per fallback Icecat)"
                            value={productForm.marca}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          Codice produttore
                          <input
                            type="text"
                            name="codiceProduttore"
                            placeholder="Es. GS-25U3 (per fallback Icecat)"
                            value={productForm.codiceProduttore}
                            onChange={handleProductFormChange}
                          />
                        </label>
                        <label>
                          {isOffertaContext ? 'Prezzo offerta' : 'Prezzo base'}
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
                            className="catalog-category-select"
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

                        <div className="product-form-actions" style={{ gap: '0.5rem' }}>
                          <button type="submit" disabled={savingProduct || syncingMagentoSingle}>
                            {savingProduct
                              ? 'Salvataggio...'
                              : 'Salva modifiche'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={savingProduct || syncingMagentoSingle}
                            onClick={() => handleSyncSingleProductToMagento(selectedProduct.id)}
                            title="Aggiorna solo questo prodotto su Magento"
                          >
                            {syncingMagentoSingle ? 'Sync Magento...' : 'Aggiorna su Magento'}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files && e.target.files[0];
                                setManualImageFile(file || null);
                              }}
                            />
                            <button
                              type="button"
                              className="icon-button icon-button-secondary"
                              onClick={() => handleAddDocumentFromUrl(selectedProduct.id)}
                              disabled={addingDocument || !manualImageFile}
                              title="Carica un'immagine dal PC"
                            >
                              {addingDocument ? 'Caricamento...' : 'Carica immagine'}
                            </button>
                          </div>
                          <span className="muted" style={{ fontSize: '0.75rem' }}>
                            Usa questo campo se Icecat non trova l'immagine o se quella trovata è sbagliata. L'immagine viene salvata localmente.
                          </span>
                        </div>
                        {selectedProduct.documenti &&
                        selectedProduct.documenti.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {[...selectedProduct.documenti]
                              .sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999))
                              .map((d) => {
                              const url = d.url || d.urlDocumento;
                              const imgSrc = url?.startsWith('/') ? (API_ORIGIN + url) : (url?.includes('icecat') || url?.startsWith('http') ? `${API_BASE}/images/proxy?url=${encodeURIComponent(url)}` : url);
                              const tipo = (d.tipo || '').toLowerCase();
                              const isImg =
                                tipo === 'immagine' ||
                                tipo === 'image' ||
                                tipo === 'immagine_manual' ||
                                tipo.startsWith('immagine');
                              const isMain = isImg && ((d.ordine ?? 999) === 0);
                              return (
                                <li key={d.id || `${d.tipo}-${url}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: isMain ? '#fff5f5' : '#f9fafb', border: isMain ? '2px solid #dc2626' : '1px solid #e5e7eb', borderRadius: 8, minWidth: 140 }}>
                                  {isImg && imgSrc ? (
                                    <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                                      <img
                                        src={imgSrc}
                                        alt="Anteprima"
                                        style={{ maxWidth: 140, maxHeight: 140, width: 'auto', height: 'auto', objectFit: 'contain' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    </div>
                                  ) : null}
                                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{d.tipoDocumento || d.tipo}{isMain ? ' · Principale' : ''}</span>
                                  {isImg && (
                                    <button
                                      type="button"
                                      className="icon-button icon-button-secondary"
                                      title="Imposta come immagine principale"
                                      disabled={isMain}
                                      onClick={() => handleSetDocumentAsMain(selectedProduct.id, d.id)}
                                    >
                                      {isMain ? '✓ Principale' : 'Imposta principale'}
                                    </button>
                                  )}
                                  {d.id && (
                                    <button
                                      type="button"
                                      className="icon-button icon-button-danger"
                                      title="Rimuovi documento"
                                      onClick={() => handleDeleteDocument(selectedProduct.id, d.id)}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                  {!isImg && url && <a href={url?.startsWith('/') ? API_ORIGIN + url : url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem' }}>{url}</a>}
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
                )}
              </div>
              )}
                  </>
                );
                return (
                  <>
                    {!catalogFullscreen && <div className="catalog-fullscreen-wrapper" ref={catalogFullscreenRef}>{catalogFSContent}</div>}
                    {catalogFullscreen && fullscreenPortalRoot && createPortal(
                      <div className="catalog-fullscreen-wrapper" ref={fullscreenPortalRef} style={{ width: '100vw', height: '100vh', minWidth: '100vw', minHeight: '100vh', maxWidth: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb', boxSizing: 'border-box' }}>{catalogFSContent}</div>,
                      fullscreenPortalRoot
                    )}
                  </>
                );
              })()}

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
                  title="Sincronizza l'intero catalogo su Magento via REST API"
                  onClick={handleExportMagento}
                  disabled={syncingMagento || syncingMagentoCategories || syncingMagentoCurrentCategory}
                >
                  {syncingMagento ? 'Sincronizzazione Magento...' : '📤 Esporta su Magento'}
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  title="Apri la lista categorie da esportare su Magento"
                  onClick={() => {
                    const fallbackId = activeCategoryId ? String(activeCategoryId) : '';
                    setSelectedMagentoCategoryId((prev) => prev || fallbackId);
                    setShowMagentoCategoryModal(true);
                  }}
                  disabled={syncingMagento || syncingMagentoCategories || syncingMagentoCurrentCategory}
                >
                  {syncingMagentoCurrentCategory
                    ? 'Categoria Magento...'
                    : '📦 Esporta categoria su Magento'}
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  title="Dopo aver spostato prodotti tra categorie nel catalogo virtuale, allinea le categorie su Magento (solo prodotti già esistenti)"
                  onClick={handleSyncMagentoCategories}
                  disabled={syncingMagento || syncingMagentoCategories || syncingMagentoCurrentCategory}
                >
                  {syncingMagentoCategories
                    ? 'Categorie Magento...'
                    : '📁 Solo categorie Magento'}
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
                  title={canRollbackLastImport ? "Scegli quale import annullare" : "Nessun import applicato. Applica un import da un fornitore (⇢) per poterlo annullare."}
                  onClick={openRollbackSelectModal}
                  disabled={savingProduct || !canRollbackLastImport}
                >
                  ↩ Annulla import
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  title="Cronologia modifiche di tutti i prodotti"
                  onClick={openRevisionsModal}
                  disabled={savingProduct}
                >
                  ↩ Annulla modifiche prodotti
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  title="Svuota una categoria (cestino o solo flag virtuali)"
                  onClick={() => {
                    const fallbackId = activeCategoryId ? String(activeCategoryId) : '';
                    setSelectedEmptyCategoryId((prev) => prev || fallbackId);
                    setShowEmptyCategoryModal(true);
                  }}
                  disabled={syncingMagento || syncingMagentoCategories || syncingMagentoCurrentCategory || emptyingCategory}
                >
                  {emptyingCategory ? 'Svuotamento...' : '🗂️ Svuota categoria'}
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
                    {selectedSupplier?.nome &&
                      String(selectedSupplier.nome).toLowerCase() === 'takefive' && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={handleScrapeTakefiveOffers}
                          disabled={uploading}
                          title="Esegue lo scraper Takefive e prepara un CSV da anteprima"
                        >
                          Aggiorna offerte
                        </button>
                      )}
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
                  {!loadingSupplierImports && !supplierImportsError && supplierImports.length > 0 && (
                    <div
                      className="card"
                      style={{
                        marginBottom: '0.85rem',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      <strong>Compara CSV (solo questo fornitore)</strong>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr auto',
                          gap: '0.5rem',
                          alignItems: 'center',
                        }}
                      >
                        <select
                          value={csvCompareLeftId}
                          onChange={(e) => setCsvCompareLeftId(e.target.value)}
                          disabled={csvCompareLoading}
                        >
                          <option value="">CSV A...</option>
                          {supplierImports.map((log) => (
                            <option key={`left-${log.id}`} value={log.id}>
                              {log.fileName} ({new Date(log.importedAt).toLocaleString()})
                            </option>
                          ))}
                        </select>
                        <select
                          value={csvCompareRightId}
                          onChange={(e) => setCsvCompareRightId(e.target.value)}
                          disabled={csvCompareLoading}
                        >
                          <option value="">CSV B...</option>
                          {supplierImports.map((log) => (
                            <option key={`right-${log.id}`} value={log.id}>
                              {log.fileName} ({new Date(log.importedAt).toLocaleString()})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleCompareSupplierCsv}
                          disabled={csvCompareLoading || !csvCompareLeftId || !csvCompareRightId}
                        >
                          {csvCompareLoading ? 'Confronto...' : 'Compara CSV'}
                        </button>
                      </div>

                      {csvCompareResult && (
                        <div
                          style={{
                            border: '1px solid #f2c1c1',
                            borderRadius: '8px',
                            padding: '0.65rem',
                            background: '#fff8f8',
                          }}
                        >
                          <p style={{ margin: '0 0 0.35rem 0' }}>
                            <strong>{csvCompareResult.recommendation}</strong>
                          </p>
                          <p className="muted" style={{ margin: 0 }}>
                            A: {csvCompareResult.leftFileName} | B: {csvCompareResult.rightFileName}
                          </p>
                          <p className="muted" style={{ margin: '0.3rem 0 0 0' }}>
                            Righe A: {csvCompareResult.leftRows} | Righe B: {csvCompareResult.rightRows} | Uguali:{' '}
                            {csvCompareResult.unchanged} | Solo A: {csvCompareResult.onlyLeft} | Solo B:{' '}
                            {csvCompareResult.onlyRight}
                          </p>
                          <p className="muted" style={{ margin: '0.3rem 0 0 0' }}>
                            Prezzo cambiato: {csvCompareResult.priceChanged} | Disponibilita cambiata:{' '}
                            {csvCompareResult.availabilityChanged} | Stato offerta cambiato:{' '}
                            {csvCompareResult.offerChanged}
                          </p>
                          {csvComparePriceStats.total > 0 && (
                            <p className="muted" style={{ margin: '0.3rem 0 0 0' }}>
                              Prezzi: {csvComparePriceStats.lower} elementi più bassi, {csvComparePriceStats.higher} elementi più alti
                              {csvComparePriceStats.unchanged > 0 ? `, ${csvComparePriceStats.unchanged} invariati` : ''}.
                            </p>
                          )}
                          {Array.isArray(csvCompareResult.newlyInOfferKeys) &&
                            csvCompareResult.newlyInOfferKeys.length > 0 && (
                              <p className="muted" style={{ margin: '0.3rem 0 0 0' }}>
                                Nuove offerte: {csvCompareResult.newlyInOfferKeys.slice(0, 15).join(', ')}
                              </p>
                            )}
                          {Array.isArray(csvCompareResult.priceDifferences) &&
                            csvCompareResult.priceDifferences.length > 0 && (
                              <div style={{ marginTop: '0.6rem' }}>
                                <p style={{ margin: '0 0 0.35rem 0' }}>
                                  <strong>Lista variazioni prezzo</strong>
                                </p>
                                <div
                                  style={{
                                    maxHeight: '260px',
                                    overflow: 'auto',
                                    border: '1px solid #f2d6d6',
                                    borderRadius: '6px',
                                    background: '#fff',
                                  }}
                                >
                                  <table style={{ width: '100%', fontSize: '0.9rem' }}>
                                    <thead>
                                      <tr>
                                        <th>Nome</th>
                                        <th>SKU</th>
                                        <th>EAN</th>
                                        <th>Vecchio</th>
                                        <th>Nuovo</th>
                                        <th>Delta</th>
                                        <th>Stato</th>
                                        <th>Match</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {csvCompareResult.priceDifferences.map((d, idx) => (
                                        <tr key={`price-diff-${idx}`}>
                                          <td>{d.nome || '-'}</td>
                                          <td>{d.sku || '-'}</td>
                                          <td>{d.ean || '-'}</td>
                                          <td>{d.oldPrice != null ? formatPrezzo(d.oldPrice) : '-'}</td>
                                          <td>{d.newPrice != null ? formatPrezzo(d.newPrice) : '-'}</td>
                                          <td>
                                            {typeof d.delta === 'number'
                                              ? `${d.delta >= 0 ? '+' : '-'}${formatPrezzo(Math.abs(d.delta))}`
                                              : '-'}
                                          </td>
                                          <td>{d.direction || '-'}</td>
                                          <td>{d.matchedBy || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          {Array.isArray(csvCompareResult.missingInRight) &&
                            csvCompareResult.missingInRight.length > 0 && (
                              <p className="muted" style={{ margin: '0.45rem 0 0 0' }}>
                                Solo in CSV A: {csvCompareResult.missingInRight.slice(0, 15).map((x) => x.sku || x.ean || x.nome).filter(Boolean).join(', ')}
                              </p>
                            )}
                          {Array.isArray(csvCompareResult.missingInLeft) &&
                            csvCompareResult.missingInLeft.length > 0 && (
                              <p className="muted" style={{ margin: '0.3rem 0 0 0' }}>
                                Solo in CSV B: {csvCompareResult.missingInLeft.slice(0, 15).map((x) => x.sku || x.ean || x.nome).filter(Boolean).join(', ')}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  )}
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
                                  title="Confronta CSV con database"
                                  disabled={csvCompareLoading || String(log.tipo).toUpperCase() !== 'PRODOTTI'}
                                  onClick={() => handleCompareCsvWithDatabase(log.id)}
                                >
                                  DB
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
        {activeNav === 'cestino' && (
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Cestino articoli</h2>
              <button
                type="button"
                className="icon-button icon-button-danger"
                title="Elimina definitivamente tutti gli articoli nel cestino"
                onClick={handleEmptyTrash}
                disabled={savingProduct || loadingDeletedProducts || deletedProducts.length === 0}
              >
                🗑️ Svuota cestino
              </button>
            </div>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              Qui trovi i prodotti eliminati dal catalogo. Puoi ripristinarli quando vuoi.
            </p>
            <div className="filters-grid" style={{ marginTop: '0.75rem' }}>
              <input
                type="text"
                name="nome"
                placeholder="Nome prodotto"
                value={trashFilters.nome}
                onChange={(e) => setTrashFilters((prev) => ({ ...prev, nome: e.target.value }))}
              />
              <input
                type="text"
                name="sku"
                placeholder="SKU"
                value={trashFilters.sku}
                onChange={(e) => setTrashFilters((prev) => ({ ...prev, sku: e.target.value }))}
              />
              <input
                type="text"
                name="ean"
                placeholder="EAN"
                value={trashFilters.ean}
                onChange={(e) => setTrashFilters((prev) => ({ ...prev, ean: e.target.value }))}
              />
              <input
                type="text"
                name="categoria"
                placeholder="Categoria"
                value={trashFilters.categoria}
                onChange={(e) => setTrashFilters((prev) => ({ ...prev, categoria: e.target.value }))}
              />
              <input
                type="text"
                name="fornitore"
                placeholder="Nome fornitore"
                value={trashFilters.fornitore}
                onChange={(e) => setTrashFilters((prev) => ({ ...prev, fornitore: e.target.value }))}
              />
              {(trashFilters.nome || trashFilters.sku || trashFilters.ean || trashFilters.categoria || trashFilters.fornitore) && (
                <button
                  type="button"
                  className="icon-button icon-button-secondary"
                  onClick={() => setTrashFilters({ nome: '', sku: '', ean: '', categoria: '', fornitore: '' })}
                >
                  Azzera filtri
                </button>
              )}
            </div>
            {loadingDeletedProducts ? (
              <p className="muted">Caricamento...</p>
            ) : deletedProducts.length === 0 ? (
              <p className="muted">Cestino vuoto.</p>
            ) : filteredDeletedProducts.length === 0 ? (
              <p className="muted">Nessun prodotto trovato con i filtri impostati.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Eliminato il</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeletedProducts.map((p) => (
                      <tr key={`deleted-${p.id}`}>
                        <td>{p.sku || '—'}</td>
                        <td>{p.nome || '—'}</td>
                        <td>{p.categoria?.nome || '—'}</td>
                        <td>{p.deletedAt ? new Date(p.deletedAt).toLocaleString() : '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="icon-button icon-button-secondary"
                            title="Ripristina articolo nel catalogo"
                            disabled={savingProduct}
                            onClick={() => handleRestoreDeletedProduct(p.id)}
                          >
                            ↩ Ripristina
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
