/* Coffee Drink Cost Tracker (local-only, no deps) */

(() => {
  "use strict";

  const STORAGE_KEY = "coffeeDrinkCostTracker.cv2.v1";
  const LEGACY_STORAGE_KEY = "coffeeDrinkCostTracker.v1";
  const LEGACY_INGREDIENT_CATEGORY_KEY = "coffeeDrinkCostTracker.ingredientCategories.v1";
  const CV2_INGREDIENT_CATEGORY_KEY = "coffeeDrinkCostTracker.cv2.ingredientCategories.v1";
  const CV2_MIGRATION_MARKER_KEY = "coffeeDrinkCostTracker.cv2.migratedFromCv1";
  const STATE_VERSION = 1;
  const DEFAULT_SALES_TAX_PCT = 6;
  const GEMINI_API_KEY = "";
  const GEMINI_MODEL = "gemini-2.5-flash";
  const GEMINI_MODEL_FALLBACKS = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
  const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
  const GEMINI_API_CONFIG = Object.freeze({
    apiKey: GEMINI_API_KEY,
    model: GEMINI_MODEL,
    baseUrl: GEMINI_API_BASE,
  });
  window.SHOTCOST_CV2_AI = GEMINI_API_CONFIG;

  // Unit conversions (US customary)
  const G_PER_OZ = 28.349523125;
  const ML_PER_FL_OZ = 29.5735295625;
  const ML_PER_GALLON = 3785.411784; // US gallon
  const ML_PER_QUART = 946.352946; // US quart

	  const DEFAULT_STATE = {
	    meta: { version: STATE_VERSION, currency: "USD", lastSavedAtIso: null, upchargeSelectionMigrationDone: false },
	    settings: { ccFeePct: 2.6, ccFeeFixedMills: 150, theme: "dark", taxMode: "additive" },
	    ingredients: { byId: {}, order: [] },
	    milks: { byId: {}, order: [] },
    modifiers: { byId: {}, order: [] },
	    milkCategories: { order: [] },
	    cups: { byId: {}, order: [] },
	    drinks: { byId: {}, order: [] },
	    categories: { order: [] },
		    ui: {
	      draftDrink: null,
	      draftBaselineDrinkId: "",
	      draftBaselineJson: "",
	      selectedLibraryDrinkId: null,
	      selectedLibraryFamilyKey: "",
      libraryDetailMode: "drink",
	      ingredientSearch: "",
	      milkSearch: "",
	      librarySearch: "",
	      libraryDescMode: "detailed",
	      librarySortMode: "family",
	      cupSearch: "",
      modifierSearch: "",
      libraryModifierScenarioByDrink: {},
	      libraryFamilyCollapsed: {},
	      librarySelectedDrinkIds: [],
	      milkLibrarySuppressedIngredientIds: [],
	      variantBaseFamilyKey: "",
      variantFlavorByFamilyKey: {},
      variantQtyByFamilyKey: {},
      squareSalesReport: null,
      squareSalesCollapsed: { matched: false, unmatched: false },
      aiCsvReport: null,
      aiCsvDraft: {
        includeRaw: false,
      },
    },
  };

  const els = {
    metaStatus: document.getElementById("metaStatus"),

    tabs: Array.from(document.querySelectorAll(".tab")),
    views: Array.from(document.querySelectorAll(".view")),

    fileImport: document.getElementById("fileImport"),
    fileImportSquareCsv: document.getElementById("fileImportSquareCsv"),

    // Builder
    btnNewDraft: document.getElementById("btnNewDraft"),
    btnSaveDrink: document.getElementById("btnSaveDrink"),
    btnGenerateVariants: document.getElementById("btnGenerateVariants"),
    drinkName: document.getElementById("drinkName"),
    drinkCategory: document.getElementById("drinkCategory"),
    builderCupList: document.getElementById("builderCupList"),
    btnBuilderCupAll: document.getElementById("btnBuilderCupAll"),
    btnBuilderCupNone: document.getElementById("btnBuilderCupNone"),
    sellPrice: document.getElementById("sellPrice"),
    targetMargin: document.getElementById("targetMargin"),
    btnSetPriceFromMargin: document.getElementById("btnSetPriceFromMargin"),
    drinkNotes: document.getElementById("drinkNotes"),
    btnAddLine: document.getElementById("btnAddLine"),
    builderTableWrap: document.getElementById("builderTableWrap"),
    builderMilkList: document.getElementById("builderMilkList"),
    btnBuilderMilkAll: document.getElementById("btnBuilderMilkAll"),
    btnBuilderMilkNone: document.getElementById("btnBuilderMilkNone"),
    salesTaxPct: document.getElementById("salesTaxPct"),
    errDrinkName: document.getElementById("errDrinkName"),
    pillDraft: document.getElementById("pillDraft"),

	    // Results
	    lblSellPrice: document.getElementById("lblSellPrice"),
	    tileConsumerPrice: document.getElementById("tileConsumerPrice"),
	    kpiTotalCost: document.getElementById("kpiTotalCost"),
	    kpiCostHint: document.getElementById("kpiCostHint"),
	    kpiSellPrice: document.getElementById("kpiSellPrice"),
	    kpiPriceHint: document.getElementById("kpiPriceHint"),
	    kpiConsumerPrice: document.getElementById("kpiConsumerPrice"),
	    kpiConsumerHint: document.getElementById("kpiConsumerHint"),
    kpiProfit: document.getElementById("kpiProfit"),
    kpiProfitHint: document.getElementById("kpiProfitHint"),
    kpiProfitCard: document.getElementById("kpiProfitCard"),
    kpiProfitCardHint: document.getElementById("kpiProfitCardHint"),
    kpiMargin: document.getElementById("kpiMargin"),
    kpiMarginHint: document.getElementById("kpiMarginHint"),
    kpiMarginCard: document.getElementById("kpiMarginCard"),
    kpiMarginCardHint: document.getElementById("kpiMarginCardHint"),
    breakdownWrap: document.getElementById("breakdownWrap"),

    // Results tabs + CC fees
    tabResultsSummary: document.getElementById("tabResultsSummary"),
    tabResultsCC: document.getElementById("tabResultsCC"),
    resultsSummary: document.getElementById("resultsSummary"),
    resultsCC: document.getElementById("resultsCC"),
    ccFeePct: document.getElementById("ccFeePct"),
    ccFeeFixed: document.getElementById("ccFeeFixed"),
    kpiCcFee: document.getElementById("kpiCcFee"),
    kpiCcFeeHint: document.getElementById("kpiCcFeeHint"),
    kpiProfitCc: document.getElementById("kpiProfitCc"),
    kpiProfitCcHint: document.getElementById("kpiProfitCcHint"),
    kpiMarginCc: document.getElementById("kpiMarginCc"),
    kpiMarginCcHint: document.getElementById("kpiMarginCcHint"),

	    // Library
	    librarySearch: document.getElementById("librarySearch"),
	    btnCreateCategory: document.getElementById("btnCreateCategory"),
    btnLibraryExpandAll: document.getElementById("btnLibraryExpandAll"),
    btnLibraryCollapseAll: document.getElementById("btnLibraryCollapseAll"),
	    btnLibraryOrganize: document.getElementById("btnLibraryOrganize"),
	    btnDeleteSelectedDrinks: document.getElementById("btnDeleteSelectedDrinks"),
	    libraryListWrap: document.getElementById("libraryListWrap"),
	    libraryDetailWrap: document.getElementById("libraryDetailWrap"),
	    modalCategoryManager: document.getElementById("modalCategoryManager"),
	    btnCloseCategoryManager: document.getElementById("btnCloseCategoryManager"),
	    btnCancelCategoryManager: document.getElementById("btnCancelCategoryManager"),
	    categoryManagerName: document.getElementById("categoryManagerName"),
	    btnAddCategoryManager: document.getElementById("btnAddCategoryManager"),
	    categoryManagerListWrap: document.getElementById("categoryManagerListWrap"),

    // Milks
    milkSearch: document.getElementById("milkSearch"),
    btnNewMilk: document.getElementById("btnNewMilk"),
    btnCreateMilkCategory: document.getElementById("btnCreateMilkCategory"),
    milkTableWrap: document.getElementById("milkTableWrap"),
    modalMilkCategoryManager: document.getElementById("modalMilkCategoryManager"),
    btnCloseMilkCategoryManager: document.getElementById("btnCloseMilkCategoryManager"),
    btnCancelMilkCategoryManager: document.getElementById("btnCancelMilkCategoryManager"),
    milkCategoryManagerName: document.getElementById("milkCategoryManagerName"),
    btnAddMilkCategoryManager: document.getElementById("btnAddMilkCategoryManager"),
    milkCategoryManagerListWrap: document.getElementById("milkCategoryManagerListWrap"),

    // Ingredients
    ingredientSearch: document.getElementById("ingredientSearch"),
    btnNewIngredient: document.getElementById("btnNewIngredient"),
    ingredientTableWrap: document.getElementById("ingredientTableWrap"),

    // Cups
    cupSearch: document.getElementById("cupSearch"),
    btnNewCup: document.getElementById("btnNewCup"),
    cupTableWrap: document.getElementById("cupTableWrap"),

    // Modifiers
    modifierSearch: document.getElementById("modifierSearch"),
    btnNewModifier: document.getElementById("btnNewModifier"),
    modifierTableWrap: document.getElementById("modifierTableWrap"),

    // AI CSV matcher
    btnRunAiCsvReport: document.getElementById("btnRunAiCsvReport"),
    btnClearAiCsvReport: document.getElementById("btnClearAiCsvReport"),
    aiCsvApiKey: document.getElementById("aiCsvApiKey"),
    aiCsvUpload: document.getElementById("aiCsvUpload"),
    aiCsvIncludeRaw: document.getElementById("aiCsvIncludeRaw"),
    aiCsvStatus: document.getElementById("aiCsvStatus"),
    aiCsvSummary: document.getElementById("aiCsvSummary"),
    aiCsvRows: document.getElementById("aiCsvRows"),
    aiCsvRaw: document.getElementById("aiCsvRaw"),

	    // Settings
	    currencyCode: document.getElementById("currencyCode"),
	    themeDark: document.getElementById("themeDark"),
	    themeLight: document.getElementById("themeLight"),
	    taxModeAdditive: document.getElementById("taxModeAdditive"),
	    taxModeInclusive: document.getElementById("taxModeInclusive"),
	    btnExport2: document.getElementById("btnExport2"),
	    btnImport2: document.getElementById("btnImport2"),
	    btnExportRecipesSheets: document.getElementById("btnExportRecipesSheets"),
	    btnExportRecipesPdf: document.getElementById("btnExportRecipesPdf"),
	    btnWipe: document.getElementById("btnWipe"),
	    btnSeed: document.getElementById("btnSeed"),
	    modalRecipeExportCsv: document.getElementById("modalRecipeExportCsv"),
	    btnCloseRecipeExportCsv: document.getElementById("btnCloseRecipeExportCsv"),
	    btnCancelRecipeExportCsv: document.getElementById("btnCancelRecipeExportCsv"),
	    btnConfirmRecipeExportCsv: document.getElementById("btnConfirmRecipeExportCsv"),
		    btnRecipeExportCatsAll: document.getElementById("btnRecipeExportCatsAll"),
		    btnRecipeExportCatsNone: document.getElementById("btnRecipeExportCatsNone"),
		    recipeExportCategoryList: document.getElementById("recipeExportCategoryList"),
    recipeExportModalTitle: document.getElementById("recipeExportModalTitle"),
    recipeExportModalHint: document.getElementById("recipeExportModalHint"),
    btnImportSquareSalesCsv: document.getElementById("btnImportSquareSalesCsv"),
    btnClearSquareSales: document.getElementById("btnClearSquareSales"),
    squareSalesStatus: document.getElementById("squareSalesStatus"),
    squareSalesSummary: document.getElementById("squareSalesSummary"),
    squareSalesMatchedWrap: document.getElementById("squareSalesMatchedWrap"),
    squareSalesUnmatchedWrap: document.getElementById("squareSalesUnmatchedWrap"),

    // Ingredient modal
    modalIngredient: document.getElementById("modalIngredient"),
    ingredientForm: document.getElementById("ingredientForm"),
    ingredientModalTitle: document.getElementById("ingredientModalTitle"),
    btnSaveIngredientTop: document.getElementById("btnSaveIngredientTop"),
    btnCloseIngredient: document.getElementById("btnCloseIngredient"),
    btnCancelIngredient: document.getElementById("btnCancelIngredient"),
    btnSaveIngredient: document.getElementById("btnSaveIngredient"),
    btnDeleteIngredient: document.getElementById("btnDeleteIngredient"),
    ingName: document.getElementById("ingName"),
    ingCategory: document.getElementById("ingCategory"),
    ingUnit: document.getElementById("ingUnit"),
    wrapUnitLabel: document.getElementById("wrapUnitLabel"),
    ingUnitLabel: document.getElementById("ingUnitLabel"),
    wrapCoffeePricing: document.getElementById("wrapCoffeePricing"),
    coffeePricePerLb: document.getElementById("coffeePricePerLb"),
    coffeeDoseGrams: document.getElementById("coffeeDoseGrams"),
    coffeeUnitLabel: document.getElementById("coffeeUnitLabel"),
	    wrapPurchasePrice: document.getElementById("wrapPurchasePrice"),
		    ingPurchasePrice: document.getElementById("ingPurchasePrice"),
		    ingPurchaseUnit: document.getElementById("ingPurchaseUnit"),
		    wrapPurchaseAmount: document.getElementById("wrapPurchaseAmount"),
		    ingPurchaseAmount: document.getElementById("ingPurchaseAmount"),
	    btnToggleIngCostOverride: document.getElementById("btnToggleIngCostOverride"),
	    wrapIngCostOverride: document.getElementById("wrapIngCostOverride"),
	    ingCostOverride: document.getElementById("ingCostOverride"),
		    wrapIngUpcharge: document.getElementById("wrapIngUpcharge"),
		    ingUpcharge: document.getElementById("ingUpcharge"),
	    ingNotes: document.getElementById("ingNotes"),
	    errIngName: document.getElementById("errIngName"),
	    errIngPurchaseAmount: document.getElementById("errIngPurchaseAmount"),
	    ingUnitCost: document.getElementById("ingUnitCost"),
	    ingUnitCostHint: document.getElementById("ingUnitCostHint"),
    btnToggleCalc: document.getElementById("btnToggleCalc"),
    calcPanel: document.getElementById("calcPanel"),
    calcExpr: document.getElementById("calcExpr"),
    calcKeys: document.getElementById("calcKeys"),
    calcResult: document.getElementById("calcResult"),
    calcError: document.getElementById("calcError"),

    // Milk modal
    modalMilk: document.getElementById("modalMilk"),
    milkForm: document.getElementById("milkForm"),
    milkModalTitle: document.getElementById("milkModalTitle"),
    btnCloseMilk: document.getElementById("btnCloseMilk"),
    btnCancelMilk: document.getElementById("btnCancelMilk"),
    btnSaveMilk: document.getElementById("btnSaveMilk"),
    btnDeleteMilk: document.getElementById("btnDeleteMilk"),
    btnMilkNewIngredient: document.getElementById("btnMilkNewIngredient"),
    btnMilkEditIngredient: document.getElementById("btnMilkEditIngredient"),
    milkName: document.getElementById("milkName"),
    milkCategory: document.getElementById("milkCategory"),
    milkIngredient: document.getElementById("milkIngredient"),
    milkUpcharge: document.getElementById("milkUpcharge"),
    milkNotes: document.getElementById("milkNotes"),
    errMilkName: document.getElementById("errMilkName"),
    errMilkIngredient: document.getElementById("errMilkIngredient"),

    // Cup modal
    modalCup: document.getElementById("modalCup"),
    cupForm: document.getElementById("cupForm"),
    cupModalTitle: document.getElementById("cupModalTitle"),
    btnCloseCup: document.getElementById("btnCloseCup"),
    btnCancelCup: document.getElementById("btnCancelCup"),
    btnSaveCup: document.getElementById("btnSaveCup"),
    btnDeleteCup: document.getElementById("btnDeleteCup"),
    cupName: document.getElementById("cupName"),
    cupSizeLabel: document.getElementById("cupSizeLabel"),
    cupTemp: document.getElementById("cupTemp"),
    cupPurchasePrice: document.getElementById("cupPurchasePrice"),
    cupPurchaseQty: document.getElementById("cupPurchaseQty"),
    cupEachPrice: document.getElementById("cupEachPrice"),
    cupNotes: document.getElementById("cupNotes"),
    errCupName: document.getElementById("errCupName"),
    errCupTemp: document.getElementById("errCupTemp"),
    errCupPurchaseQty: document.getElementById("errCupPurchaseQty"),
    cupUnitCost: document.getElementById("cupUnitCost"),
    cupUnitCostHint: document.getElementById("cupUnitCostHint"),

    // Modifier modal
    modalModifier: document.getElementById("modalModifier"),
    modifierForm: document.getElementById("modifierForm"),
    modifierModalTitle: document.getElementById("modifierModalTitle"),
    btnCloseModifier: document.getElementById("btnCloseModifier"),
    btnCancelModifier: document.getElementById("btnCancelModifier"),
    btnSaveModifier: document.getElementById("btnSaveModifier"),
    btnDeleteModifier: document.getElementById("btnDeleteModifier"),
    modifierName: document.getElementById("modifierName"),
    modifierType: document.getElementById("modifierType"),
    modifierAliases: document.getElementById("modifierAliases"),
    modifierDefaultQty: document.getElementById("modifierDefaultQty"),
    modifierCostDelta: document.getElementById("modifierCostDelta"),
    modifierPriceDelta: document.getElementById("modifierPriceDelta"),
    modifierNotes: document.getElementById("modifierNotes"),
    errModifierName: document.getElementById("errModifierName"),

    // Variant generator modal
    modalVariants: document.getElementById("modalVariants"),
    variantForDrink: document.getElementById("variantForDrink"),
    variantBaseDrink: document.getElementById("variantBaseDrink"),
    variantCupList: document.getElementById("variantCupList"),
    variantMilkList: document.getElementById("variantMilkList"),
    variantFlavorSelect: document.getElementById("variantFlavorSelect"),
    variantFlavorChips: document.getElementById("variantFlavorChips"),
    variantQtyMatrixWrap: document.getElementById("variantQtyMatrixWrap"),
    btnCloseVariants: document.getElementById("btnCloseVariants"),
    btnCancelVariants: document.getElementById("btnCancelVariants"),
    btnGenerateVariantsOk: document.getElementById("btnGenerateVariantsOk"),
    btnSelectAllCups: document.getElementById("btnSelectAllCups"),
    btnSelectNoneCups: document.getElementById("btnSelectNoneCups"),
    btnSelectAllMilks: document.getElementById("btnSelectAllMilks"),
    btnSelectNoneMilks: document.getElementById("btnSelectNoneMilks"),
    btnAddVariantFlavor: document.getElementById("btnAddVariantFlavor"),
	    btnClearVariantFlavors: document.getElementById("btnClearVariantFlavors"),

	    // Library organize modal
	    modalLibraryOrganize: document.getElementById("modalLibraryOrganize"),
	    btnCloseLibraryOrganize: document.getElementById("btnCloseLibraryOrganize"),
	    btnDoneLibraryOrganize: document.getElementById("btnDoneLibraryOrganize"),
	    libraryDescDetailed: document.getElementById("libraryDescDetailed"),
	    libraryDescSimple: document.getElementById("libraryDescSimple"),
	    librarySortFamily: document.getElementById("librarySortFamily"),
	    librarySortCategory: document.getElementById("librarySortCategory"),
	    librarySortType: document.getElementById("librarySortType"),

	    // Confirm modal
	    modalConfirm: document.getElementById("modalConfirm"),
	    confirmTitle: document.getElementById("confirmTitle"),
	    confirmBody: document.getElementById("confirmBody"),
    btnCloseConfirm: document.getElementById("btnCloseConfirm"),
    btnConfirmCancel: document.getElementById("btnConfirmCancel"),
    btnConfirmOk: document.getElementById("btnConfirmOk"),

    // Currency prefix spans
	    currencyPrefixes: Array.from(
		      document.querySelectorAll(
		        "#currencyPrefix,#currencyPrefix4,#currencyPrefix5,#currencyPrefix6,#currencyPrefix7,#currencyPrefix8,#currencyPrefix9,#currencyPrefix10,#currencyPrefixMilk,#currencyPrefixModifierCost,#currencyPrefixModifierPrice"
		      )
		    ),

    toast: document.getElementById("toast"),
  };

  let state = loadState();
  let editingIngredientId = null;
  let ingredientModalLastUnitKey = null;
  let editingCupId = null;
  let editingMilkId = null;
  let editingModifierId = null;
  let ingredientModalPrefill = null;
  let pendingMilkIngredientSelect = false;
  let milkModalReturnState = null;
	  let skipMilkReturnOnClose = false;
	  let toastTimer = null;
  let variantQtyTextByCup = {};
	  let variantSelectedFlavorIds = [];
	  let recipeCsvCategoryDraft = [];
  let recipeExportMode = "csv";
  let aiCsvLastRawResponse = "";

  // ---------- Init ----------
  ensureDraftExists();
  setupListeners(); // bind clicks first
  applyThemeFromState();
  syncSettingsUIFromState();
  syncCurrencyUI();
  renderAll();
  updateMetaStatus();

  // ---------- Event wiring ----------
  function setupListeners() {
    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const route = btn.dataset.route;
        routeTo(route);
        // Re-render the view you navigated to so computed values (like CC fees) stay fresh.
        if (route === "builder") renderBuilderAndResults();
        if (route === "library") renderLibrary();
        if (route === "ingredients") renderIngredients();
        if (route === "milks") renderMilks();
        if (route === "modifiers") renderModifiers();
        if (route === "cups") renderCups();
        if (route === "reports") renderAiCsvMatcher();
      });
    });

    els.btnExport2.addEventListener("click", exportJSON);
    els.btnImport2.addEventListener("click", () => els.fileImport.click());
    els.btnExportRecipesSheets?.addEventListener("click", () => openRecipeCsvExportModal("csv"));
    els.btnExportRecipesPdf?.addEventListener("click", () => openRecipeCsvExportModal("pdf"));
    els.fileImport.addEventListener("change", importJSONFile);
    els.btnImportSquareSalesCsv?.addEventListener("click", () => els.fileImportSquareCsv?.click());
    els.fileImportSquareCsv?.addEventListener("change", importSquareSalesCsvFile);
    els.btnClearSquareSales?.addEventListener("click", () => {
      state.ui.squareSalesReport = null;
      persistAndRender();
      toast("Square sales report cleared.");
    });
    const onSquareSectionToggle = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button[data-square-section]");
      if (!(btn instanceof HTMLElement)) return;
      const section = String(btn.getAttribute("data-square-section") || "");
      if (section !== "matched" && section !== "unmatched") return;
      if (!state.ui.squareSalesCollapsed || typeof state.ui.squareSalesCollapsed !== "object") {
        state.ui.squareSalesCollapsed = { matched: false, unmatched: false };
      }
      state.ui.squareSalesCollapsed[section] = !state.ui.squareSalesCollapsed[section];
      saveStateDebounced();
      renderSquareSalesReport();
    };
    els.squareSalesMatchedWrap?.addEventListener("click", onSquareSectionToggle);
    els.squareSalesUnmatchedWrap?.addEventListener("click", onSquareSectionToggle);

    // Results tabs
    els.tabResultsSummary.addEventListener("click", () => setResultsTab("summary"));
    els.tabResultsCC.addEventListener("click", () => setResultsTab("cc"));

    // CC fee settings (persist globally)
    [els.ccFeePct, els.ccFeeFixed].forEach((el) => {
      el.addEventListener("input", () => {
        syncCcFeeFromUI();
        saveStateDebounced();
        renderResults();
        renderLibrary();
      });
      el.addEventListener("change", () => {
        syncCcFeeFromUI();
        saveStateDebounced();
        renderResults();
        renderLibrary();
      });
    });

    // Builder inputs
    const builderInputs = [
      els.drinkName,
      els.drinkCategory,
      els.sellPrice,
      els.targetMargin,
      els.drinkNotes,
      els.salesTaxPct,
    ];
    builderInputs.forEach((el) => {
      el.addEventListener("input", () => {
        syncDraftFromUI();
        saveStateDebounced();
        renderBuilderAndResults();
      });
      el.addEventListener("change", () => {
        syncDraftFromUI();
        saveStateDebounced();
        renderBuilderAndResults();
      });
    });

    // Cups used list
    els.builderCupList?.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('input[type="checkbox"][data-builder-cup-id]')) return;
      const cupId = target.getAttribute("data-builder-cup-id") || "";
      updateBuilderCupSelectionFromUI(cupId);
    });
    els.btnBuilderCupAll?.addEventListener("click", () => setAllBuilderCupChecks(true));
    els.btnBuilderCupNone?.addEventListener("click", () => setAllBuilderCupChecks(false));

    els.btnAddLine.addEventListener("click", () => {
      const hasMilkIngredients = state.milks.order.some((id) => {
        const m = state.milks.byId[id];
        if (!m?.ingredientId) return false;
        const ing = state.ingredients.byId[m.ingredientId];
        return !!ing && !ing.archived;
      });
      if (activeIngredients().length === 0 && !hasMilkIngredients) {
        toast("Add at least one ingredient first.");
        routeTo("ingredients");
        openIngredientModal(null);
        return;
      }
      addDraftLine();
    });

    els.builderTableWrap.addEventListener("input", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.classList.contains("js-line-qty-cup")) {
        const lineId = target.dataset.lineId || "";
        const cupId = target.dataset.cupId || "";
        if (!lineId || !cupId) return;
        const draft = state.ui.draftDrink;
        ensureDraftQtyByCup(draft);
        if (!draft.qtyByCup[cupId]) draft.qtyByCup[cupId] = {};
        draft.qtyByCup[cupId][lineId] = target.value;
        if (draft?.container?.cupId === cupId) {
          updateDraftLine(lineId, { qty: parseDecimal(target.value) }, { rerenderBuilderTable: false });
        } else {
          saveStateDebounced();
        }
        return;
      }
      if (target.classList.contains("js-line-qty")) {
        const lineId = target.dataset.lineId;
        updateDraftLine(lineId, { qty: parseDecimal(target.value) }, { rerenderBuilderTable: false });
      }
    });
	    els.builderTableWrap.addEventListener("change", (e) => {
	      const target = e.target;
	      if (!(target instanceof HTMLElement)) return;
	      if (target.classList.contains("js-line-ingredient")) {
	        const lineId = target.dataset.lineId;
	        updateDraftLine(lineId, { ingredientId: target.value || null });
	        return;
	      }
	      if (target.classList.contains("js-line-upcharge")) {
	        const lineId = target.dataset.lineId;
	        if (target instanceof HTMLInputElement) {
	          updateDraftLine(lineId, { includeUpcharge: !!target.checked });
	        }
	      }
	    });
    els.builderTableWrap.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      if (btn.classList.contains("js-line-remove")) {
        const lineId = btn.dataset.lineId;
        removeDraftLine(lineId);
      }
    });
    els.builderMilkList?.addEventListener("change", () => updateBuilderMilkSelectionFromUI(true));
    els.btnBuilderMilkAll?.addEventListener("click", () => setAllBuilderMilkChecks(true));
    els.btnBuilderMilkNone?.addEventListener("click", () => setAllBuilderMilkChecks(false));

    els.btnNewDraft.addEventListener("click", () => {
      confirmDialog({
        title: "New draft?",
        body: "This clears the current draft. Saved drinks in your Library are not affected.",
        okLabel: "New draft",
        danger: true,
        onOk: () => {
          state.ui.draftDrink = blankDrinkDraft();
          state.ui.selectedLibraryDrinkId = null;
          clearDraftBaseline();
          persistAndRender();
          toast("New draft started.");
        },
      });
    });

    els.btnSaveDrink.addEventListener("click", saveDraftToLibrary);
    els.btnGenerateVariants?.addEventListener("click", openVariantsModal);

	    els.btnSetPriceFromMargin.addEventListener("click", () => {
	      syncDraftFromUI();
	      const marginPct = parseDecimal(els.targetMargin.value);
	      const computed = computeDrink(state.ui.draftDrink);
	      if (!(marginPct > 0 && marginPct < 100)) {
	        toast("Enter a target margin between 0 and 100.");
	        return;
	      }
	      state.ui.draftDrink.pricing.sellPriceMills = priceForMarginMills(computed.totalCostMills, marginPct, {
	        taxMode: state?.settings?.taxMode,
	        salesTaxPct: state?.ui?.draftDrink?.extra?.salesTaxPct,
	      });
	      syncBuilderUIFromDraft();
	      persistAndRender();
	      toast("Selling price updated from target margin.");
	    });


	    // Library
		    els.librarySearch.addEventListener("input", () => {
		      state.ui.librarySearch = els.librarySearch.value;
		      saveStateDebounced();
		      renderLibrary();
		    });
	    els.btnCreateCategory?.addEventListener("click", openCategoryManagerModal);
    els.btnLibraryExpandAll?.addEventListener("click", () => setLibraryFamiliesCollapsed(false));
    els.btnLibraryCollapseAll?.addEventListener("click", () => setLibraryFamiliesCollapsed(true));
		    els.btnLibraryOrganize?.addEventListener("click", openLibraryOrganizeModal);
		    els.btnDeleteSelectedDrinks?.addEventListener("click", deleteSelectedDrinks);
	    els.btnCloseCategoryManager?.addEventListener("click", closeCategoryManagerModal);
	    els.btnCancelCategoryManager?.addEventListener("click", closeCategoryManagerModal);
	    els.btnAddCategoryManager?.addEventListener("click", addCategoryFromManagerInput);
	    els.categoryManagerName?.addEventListener("keydown", (e) => {
	      if (e.key !== "Enter") return;
	      e.preventDefault();
	      addCategoryFromManagerInput();
	    });
	    els.categoryManagerListWrap?.addEventListener("click", (e) => {
	      const target = e.target;
	      if (!(target instanceof HTMLElement)) return;
	      const btn = target.closest("button");
	      if (!(btn instanceof HTMLElement)) return;
	      const action = btn.getAttribute("data-category-action") || "";
	      const key = btn.getAttribute("data-category-key") || "";
	      if (!action || !key) return;
	      if (action === "save") {
	        saveCategoryRowByKey(key);
	        return;
	      }
	      if (action === "delete") {
	        deleteCategoryByKey(key);
	      }
	    });
	    els.btnCloseLibraryOrganize?.addEventListener("click", closeLibraryOrganizeModal);
	    els.btnDoneLibraryOrganize?.addEventListener("click", closeLibraryOrganizeModal);
	    els.libraryDescDetailed?.addEventListener("click", () => setLibraryDescMode("detailed"));
	    els.libraryDescSimple?.addEventListener("click", () => setLibraryDescMode("simple"));
	    els.librarySortFamily?.addEventListener("click", () => setLibrarySortMode("family"));
	    els.librarySortCategory?.addEventListener("click", () => setLibrarySortMode("category"));
	    els.librarySortType?.addEventListener("click", () => setLibrarySortMode("type"));
	    els.libraryListWrap.addEventListener("click", (e) => {
	      const target = e.target;
	      if (!(target instanceof HTMLElement)) return;
	      const familyDelete = target.closest('[data-action="delete-family"]');
      if (familyDelete instanceof HTMLElement) {
        const key = familyDelete.dataset.familyKey || "";
        if (key) {
          deleteLibraryFamilyByKey(key);
          return;
        }
      }
      const familyHeader = target.closest("[data-family-key]");
      if (familyHeader instanceof HTMLElement) {
        const key = familyHeader.dataset.familyKey || "";
        if (key) {
          state.ui.selectedLibraryFamilyKey = key;
          state.ui.libraryDetailMode = "family";
          state.ui.libraryFamilyCollapsed[key] = !state.ui.libraryFamilyCollapsed[key];
          saveStateDebounced();
          renderLibrary();
          return;
        }
      }
      const item = target.closest("[data-drink-id]");
      if (!item) return;
      const id = item.dataset.drinkId || null;
      if (!id) return;

      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleLibrarySelection(id);
        state.ui.selectedLibraryDrinkId = id;
        state.ui.selectedLibraryFamilyKey = libraryFamilyKeyForDrinkId(id);
        state.ui.libraryDetailMode = "drink";
        saveStateDebounced();
        renderLibrary();
        return;
      }

      // Regular click: clear multi-select and set active
      state.ui.librarySelectedDrinkIds = [];
      state.ui.selectedLibraryDrinkId = id;
      state.ui.selectedLibraryFamilyKey = libraryFamilyKeyForDrinkId(id);
      state.ui.libraryDetailMode = "drink";
      saveStateDebounced();
      renderLibrary();
    });
    els.libraryDetailWrap.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      if (!action) return;
      if (action === "load-family") {
        const familyKey = String(btn.dataset.familyKey || state.ui.selectedLibraryFamilyKey || "");
        if (!familyKey) return;
        loadLibraryFamilyIntoDraft(familyKey);
        routeTo("builder");
        toast("Loaded family profile into Builder.");
        return;
      }
      if (action === "add-library-modifier") {
        const drinkId = String(btn.dataset.drinkId || state.ui.selectedLibraryDrinkId || "");
        if (!drinkId) return;
        const select = els.libraryDetailWrap.querySelector("select[data-library-modifier-select]");
        const modifierId =
          select instanceof HTMLSelectElement && String(select.dataset.libraryModifierSelect || "") === drinkId
            ? String(select.value || "")
            : "";
        if (!modifierId) {
          toast("Select a modifier first.");
          return;
        }
        addLibraryModifierScenario(drinkId, modifierId);
        return;
      }
      if (action === "remove-library-modifier") {
        const drinkId = String(btn.dataset.drinkId || state.ui.selectedLibraryDrinkId || "");
        const modifierId = String(btn.dataset.modifierId || "");
        if (!drinkId || !modifierId) return;
        removeLibraryModifierScenario(drinkId, modifierId);
        return;
      }
      if (action === "clear-library-modifiers") {
        const drinkId = String(btn.dataset.drinkId || state.ui.selectedLibraryDrinkId || "");
        if (!drinkId) return;
        clearLibraryModifierScenario(drinkId);
        return;
      }
      const drinkId = btn.dataset.drinkId;
      if (!drinkId) return;
      if (action === "edit") {
        loadDrinkIntoDraft(drinkId);
        routeTo("builder");
        toast("Loaded into Builder.");
      } else if (action === "duplicate") {
        duplicateDrink(drinkId);
      } else if (action === "delete") {
        deleteDrink(drinkId);
      }
    });
    els.libraryDetailWrap.addEventListener("change", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches("input[data-library-modifier-qty][data-drink-id][data-modifier-id]")) return;
      const drinkId = String(target.dataset.drinkId || "");
      const modifierId = String(target.dataset.modifierId || "");
      if (!drinkId || !modifierId) return;
      const qty = Number(String(target.value || "").replace(/,/g, ""));
      updateLibraryModifierScenarioQty(drinkId, modifierId, qty);
    });

    // Ingredients
    els.ingredientSearch.addEventListener("input", () => {
      state.ui.ingredientSearch = els.ingredientSearch.value;
      saveStateDebounced();
      renderIngredients();
    });
    els.btnNewIngredient.addEventListener("click", () => openIngredientModal(null));
    els.ingredientTableWrap.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      const id = btn.dataset.ingredientId;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (action === "edit") openIngredientModal(id);
      if (action === "delete") deleteIngredientById(id);
    });

    // Milks
    els.milkSearch?.addEventListener("input", () => {
      state.ui.milkSearch = els.milkSearch.value;
      saveStateDebounced();
      renderMilks();
    });
    els.btnNewMilk?.addEventListener("click", () => openMilkModal(null));
    els.btnCreateMilkCategory?.addEventListener("click", openMilkCategoryManagerModal);
    els.btnCloseMilkCategoryManager?.addEventListener("click", closeMilkCategoryManagerModal);
    els.btnCancelMilkCategoryManager?.addEventListener("click", closeMilkCategoryManagerModal);
    els.btnAddMilkCategoryManager?.addEventListener("click", addMilkCategoryFromManagerInput);
    els.milkCategoryManagerName?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      addMilkCategoryFromManagerInput();
    });
    els.milkCategoryManagerListWrap?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!(btn instanceof HTMLElement)) return;
      const action = btn.getAttribute("data-milk-category-action") || "";
      const key = btn.getAttribute("data-milk-category-key") || "";
      if (!action || !key) return;
      if (action === "save") {
        saveMilkCategoryRowByKey(key);
        return;
      }
      if (action === "delete") {
        deleteMilkCategoryByKey(key);
      }
    });
    els.milkTableWrap?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      const id = btn.dataset.milkId;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (action === "edit") openMilkModal(id);
      if (action === "delete") deleteMilk(id);
    });

    // Modifiers
    els.modifierSearch?.addEventListener("input", () => {
      state.ui.modifierSearch = els.modifierSearch.value;
      saveStateDebounced();
      renderModifiers();
    });
    els.btnNewModifier?.addEventListener("click", () => openModifierModal(null));
    els.modifierTableWrap?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      const id = btn.dataset.modifierId;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (action === "edit") openModifierModal(id);
      if (action === "delete") deleteModifierById(id);
    });

    // Milk modal
    els.btnCloseMilk?.addEventListener("click", closeMilkModal);
    els.btnCancelMilk?.addEventListener("click", closeMilkModal);
    els.btnSaveMilk?.addEventListener("click", saveMilkFromModal);
    els.btnDeleteMilk?.addEventListener("click", deleteMilkFromModal);
    els.btnMilkNewIngredient?.addEventListener("click", () => startMilkIngredientFlow("new"));
    els.btnMilkEditIngredient?.addEventListener("click", () => startMilkIngredientFlow("edit"));

    // Ingredient modal
    els.btnCloseIngredient.addEventListener("click", closeIngredientModal);
    els.btnCancelIngredient.addEventListener("click", closeIngredientModal);
    els.ingUnit.addEventListener("change", () => {
      const next = els.ingUnit.value;
      if (ingredientModalLastUnitKey && els.ingPurchaseUnit.value === ingredientModalLastUnitKey) {
        els.ingPurchaseUnit.value = next === "custom" ? "each" : next;
      }
      ingredientModalLastUnitKey = next;
      els.wrapUnitLabel.classList.toggle("hidden", els.ingUnit.value !== "custom");
      els.wrapCoffeePricing.classList.toggle("hidden", els.ingUnit.value !== "coffee_pricing");
      els.wrapPurchasePrice.classList.toggle("hidden", els.ingUnit.value === "coffee_pricing");
      els.wrapPurchaseAmount.classList.toggle("hidden", els.ingUnit.value === "coffee_pricing");
      updateIngredientUnitCostPreview();
    });
    els.ingPurchaseUnit.addEventListener("change", updateIngredientUnitCostPreview);
	    [
	      els.ingName,
	      els.ingCategory,
	      els.ingUnitLabel,
	      els.coffeePricePerLb,
	      els.coffeeDoseGrams,
	      els.coffeeUnitLabel,
		      els.ingPurchasePrice,
		      els.ingPurchaseUnit,
		      els.ingPurchaseAmount,
	      els.ingCostOverride,
		      els.ingUpcharge,
		      els.ingNotes,
		    ].forEach((el) => el.addEventListener("input", updateIngredientUnitCostPreview));
    els.btnToggleIngCostOverride?.addEventListener("click", () => {
      if (!els.wrapIngCostOverride || !els.ingCostOverride) return;
      const isOpen = !els.wrapIngCostOverride.classList.contains("hidden");
      if (isOpen) {
        els.ingCostOverride.value = "";
        setIngredientCostOverrideOpen(false);
      } else {
        setIngredientCostOverrideOpen(true);
      }
      updateIngredientUnitCostPreview();
    });
    els.btnSaveIngredient.addEventListener("click", saveIngredientFromModal);
    els.btnSaveIngredientTop?.addEventListener("click", saveIngredientFromModal);
    els.btnDeleteIngredient.addEventListener("click", deleteIngredientFromModal);

    // Dialog lifecycle (escape/backdrop)
    els.modalIngredient.addEventListener("close", () => {
      editingIngredientId = null;
      ingredientModalLastUnitKey = null;
      setCalcOpen(false);
    });

    // Cups
    els.cupSearch.addEventListener("input", () => {
      state.ui.cupSearch = els.cupSearch.value;
      saveStateDebounced();
      renderCups();
    });
    els.btnNewCup.addEventListener("click", () => openCupModal(null));
    els.cupTableWrap.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      const id = btn.dataset.cupId;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (action === "edit") openCupModal(id);
      if (action === "delete") deleteCup(id);
    });

    // Cup modal
    els.btnCloseCup.addEventListener("click", closeCupModal);
    els.btnCancelCup.addEventListener("click", closeCupModal);
    [els.cupName, els.cupSizeLabel, els.cupPurchasePrice, els.cupPurchaseQty, els.cupEachPrice, els.cupNotes].forEach(
      (el) => el.addEventListener("input", updateCupUnitCostPreview)
    );
    els.cupTemp?.addEventListener("change", () => {
      if (els.errCupTemp) els.errCupTemp.textContent = "";
    });
    els.btnSaveCup.addEventListener("click", saveCupFromModal);
    els.btnDeleteCup.addEventListener("click", deleteCupFromModal);
    els.modalCup.addEventListener("close", () => {
      editingCupId = null;
    });

    // Modifier modal
    els.btnCloseModifier?.addEventListener("click", closeModifierModal);
    els.btnCancelModifier?.addEventListener("click", closeModifierModal);
    els.btnSaveModifier?.addEventListener("click", saveModifierFromModal);
    els.btnDeleteModifier?.addEventListener("click", deleteModifierFromModal);
    els.modalModifier?.addEventListener("close", () => {
      editingModifierId = null;
    });

    // AI CSV matcher
    const aiDraftInputs = [els.aiCsvIncludeRaw].filter(Boolean);
    const onAiDraftInput = () => {
      syncAiCsvDraftFromUI();
      saveStateDebounced();
      renderAiCsvMatcher();
    };
    aiDraftInputs.forEach((el) => {
      el.addEventListener("change", onAiDraftInput);
      if (!(el instanceof HTMLInputElement && el.type === "checkbox")) {
        el.addEventListener("input", onAiDraftInput);
      }
    });
    els.btnRunAiCsvReport?.addEventListener("click", runAiCsvReport);
    els.aiCsvUpload?.addEventListener("change", () => {
      const file = els.aiCsvUpload?.files?.[0];
      if (!file) return;
      if (els.aiCsvStatus) els.aiCsvStatus.textContent = `Selected CSV: ${file.name}`;
    });
    els.btnClearAiCsvReport?.addEventListener("click", () => {
      state.ui.aiCsvReport = null;
      aiCsvLastRawResponse = "";
      if (els.aiCsvUpload) els.aiCsvUpload.value = "";
      saveStateDebounced();
      renderAiCsvMatcher();
      toast("AI CSV results cleared.");
    });

	    // Settings
    els.currencyCode.addEventListener("change", () => {
      state.meta.currency = els.currencyCode.value;
      syncCurrencyUI();
      persistAndRender();
      toast("Currency updated.");
    });
	    const setTheme = (theme) => {
	      state.settings.theme = theme === "light" ? "light" : "dark";
	      applyThemeFromState();
	      saveStateDebounced();
	    };
	    els.themeDark?.addEventListener("click", () => setTheme("dark"));
	    els.themeLight?.addEventListener("click", () => setTheme("light"));
	    const setTaxMode = (mode) => {
	      state.settings.taxMode = mode === "inclusive" ? "inclusive" : "additive";
	      syncSettingsUIFromState();
	      saveStateDebounced();
	      renderBuilderAndResults();
	      renderLibrary();
	    };
	    els.taxModeAdditive?.addEventListener("click", () => setTaxMode("additive"));
	    els.taxModeInclusive?.addEventListener("click", () => setTaxMode("inclusive"));
		    els.btnWipe.addEventListener("click", wipeAllData);
		    els.btnSeed.addEventListener("click", seedSampleData);
	    els.btnCloseRecipeExportCsv?.addEventListener("click", closeRecipeCsvExportModal);
	    els.btnCancelRecipeExportCsv?.addEventListener("click", closeRecipeCsvExportModal);
	    els.btnRecipeExportCatsAll?.addEventListener("click", () => {
      setAllRecipeExportChecks(true);
	    });
	    els.btnRecipeExportCatsNone?.addEventListener("click", () => {
      setAllRecipeExportChecks(false);
	    });
    els.recipeExportCategoryList?.addEventListener("click", onRecipeExportCategoryListClick);
    els.recipeExportCategoryList?.addEventListener("change", onRecipeExportCategoryListChange);
    els.recipeExportCategoryList?.addEventListener("input", onRecipeExportCategoryListInput);
	    els.btnConfirmRecipeExportCsv?.addEventListener("click", () => {
      const selectedDrinkKeys = new Set();
      const selectedCategoryKeys = new Set();
      for (const cat of recipeCsvCategoryDraft || []) {
        if (cat?.checked) selectedCategoryKeys.add(String(cat.key || ""));
        for (const g of cat?.groups || []) {
          if (g?.checked) selectedDrinkKeys.add(String(g.key || ""));
        }
      }
	      if (!selectedDrinkKeys.size) {
	        toast("Select at least one drink.");
	        return;
	      }
	      closeRecipeCsvExportModal();
      const exportOpts = { categoryKeys: selectedCategoryKeys, drinkKeys: selectedDrinkKeys };
      if (recipeExportMode === "pdf") {
        exportRecipesPDF(exportOpts);
      } else {
        exportRecipesCSV(exportOpts);
      }
	    });

    // Ingredient modal calculator
    els.btnToggleCalc?.addEventListener("click", () => setCalcOpen(els.calcPanel?.classList.contains("hidden")));
    els.calcKeys?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-calc-key]");
      if (!(btn instanceof HTMLElement)) return;
      const key = btn.dataset.calcKey || "";
      handleCalcKey(key);
    });
    els.calcExpr?.addEventListener("input", () => {
      if (els.calcError) els.calcError.textContent = "";
    });
    els.calcExpr?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCalcKey("=");
      }
    });

    // Variant generator modal
    els.btnCloseVariants?.addEventListener("click", closeVariantsModal);
    els.btnCancelVariants?.addEventListener("click", closeVariantsModal);
    els.btnGenerateVariantsOk?.addEventListener("click", generateVariantsFromDraft);
    els.variantBaseDrink?.addEventListener("change", () => {
      state.ui.variantBaseFamilyKey = els.variantBaseDrink?.value || "";
      saveStateDebounced();
      const base = getVariantBaseDrink();
      renderVariantBasePill(base);
      renderVariantCupList(base);
      loadVariantQtyForBase(base);
      loadVariantFlavorsForBase();
      renderVariantFlavorSelect();
      renderVariantFlavorChips();
      renderVariantQtyMatrix();
    });
    els.btnSelectAllCups?.addEventListener("click", () => {
      setAllVariantChecks(els.variantCupList, true);
      renderVariantQtyMatrix();
    });
    els.btnSelectNoneCups?.addEventListener("click", () => {
      setAllVariantChecks(els.variantCupList, false);
      renderVariantQtyMatrix();
    });
    els.btnSelectAllMilks?.addEventListener("click", () => {
      setAllVariantChecks(els.variantMilkList, true);
    });
    els.btnSelectNoneMilks?.addEventListener("click", () => {
      setAllVariantChecks(els.variantMilkList, false);
    });
    els.btnAddVariantFlavor?.addEventListener("click", addVariantFlavorFromSelect);
    els.btnClearVariantFlavors?.addEventListener("click", clearVariantFlavors);
    els.variantFlavorChips?.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("[data-remove-flavor-id]");
      if (!(btn instanceof HTMLElement)) return;
      const id = btn.getAttribute("data-remove-flavor-id") || "";
      if (!id) return;
      removeVariantFlavor(id);
    });
    if (els.variantCupList) {
      els.variantCupList.addEventListener("change", () => {
        renderVariantQtyMatrix();
      });
    }
    if (els.variantMilkList) els.variantMilkList.addEventListener("change", () => {});
    if (els.variantQtyMatrixWrap) {
      els.variantQtyMatrixWrap.addEventListener("input", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (!target.classList.contains("js-var-qty")) return;
        const cupId = target.dataset.varCupId || "";
        const lineId = target.dataset.varLineId || "";
        if (!cupId || !lineId) return;
        if (!variantQtyTextByCup[cupId]) variantQtyTextByCup[cupId] = {};
        variantQtyTextByCup[cupId][lineId] = target.value;
        persistVariantQtyForBase();
      });
    }
  }

  function closeVariantsModal() {
    if (els.modalVariants?.open) els.modalVariants.close();
  }

  function getLibraryDescMode() {
    return state?.ui?.libraryDescMode === "simple" ? "simple" : "detailed";
  }

  function getLibrarySortMode() {
    const mode = state?.ui?.librarySortMode;
    if (mode === "category" || mode === "type") return mode;
    return "family";
  }

  function syncLibraryOrganizeUI() {
    const mode = getLibraryDescMode();
    const sortMode = getLibrarySortMode();
    els.libraryDescDetailed?.classList.toggle("is-active", mode === "detailed");
    els.libraryDescSimple?.classList.toggle("is-active", mode === "simple");
    els.librarySortFamily?.classList.toggle("is-active", sortMode === "family");
    els.librarySortCategory?.classList.toggle("is-active", sortMode === "category");
    els.librarySortType?.classList.toggle("is-active", sortMode === "type");
  }

  function setLibraryDescMode(mode) {
    state.ui.libraryDescMode = mode === "simple" ? "simple" : "detailed";
    syncLibraryOrganizeUI();
    saveStateDebounced();
    renderLibrary();
  }

  function setLibrarySortMode(mode) {
    state.ui.librarySortMode = mode === "category" || mode === "type" ? mode : "family";
    syncLibraryOrganizeUI();
    saveStateDebounced();
    renderLibrary();
  }

  function setLibraryFamiliesCollapsed(collapsed) {
    if (!state.ui.libraryFamilyCollapsed || typeof state.ui.libraryFamilyCollapsed !== "object") {
      state.ui.libraryFamilyCollapsed = {};
    }
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      const key = libraryFamilyKeyForDrinkId(id);
      if (!key) continue;
      state.ui.libraryFamilyCollapsed[key] = !!collapsed;
    }
    saveStateDebounced();
    renderLibrary();
  }

  function openLibraryOrganizeModal() {
    if (!els.modalLibraryOrganize) return;
    syncLibraryOrganizeUI();
    els.modalLibraryOrganize.showModal();
  }

  function closeLibraryOrganizeModal() {
    if (els.modalLibraryOrganize?.open) els.modalLibraryOrganize.close();
  }

  function setAllVariantChecks(container, checked) {
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = !!checked;
    });
  }

  function getCheckedVariantIds(container, dataAttrName) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(`input[type="checkbox"][${dataAttrName}]:checked`))
      .map((el) => el.getAttribute(dataAttrName))
      .filter(Boolean);
  }

  function drinkCategoryKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function milkCategoryKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function ensureCategoryStore() {
    if (!state.categories || typeof state.categories !== "object") state.categories = { order: [] };
    if (!Array.isArray(state.categories.order)) state.categories.order = [];
  }

  function ensureCustomDrinkCategory(name) {
    const label = String(name || "").trim();
    if (!label) return false;
    ensureCategoryStore();
    const key = drinkCategoryKey(label);
    const exists = state.categories.order.some((entry) => drinkCategoryKey(entry) === key);
    if (exists) return false;
    state.categories.order.push(label);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    state.categories.order.sort((a, b) => collator.compare(a, b));
    return true;
  }

  function getBuilderDrinkCategories(extraCategory = "") {
    const seen = new Set();
    const out = [];
    const add = (value) => {
      const label = String(value || "").trim();
      if (!label) return;
      const key = drinkCategoryKey(label);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(label);
    };
    ensureCategoryStore();
    for (const c of state.categories.order) add(c);
    for (const id of state.drinks.order || []) add(state.drinks.byId[id]?.category);
    add(extraCategory);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    out.sort((a, b) => collator.compare(a, b));
    return out;
  }

  function renderDrinkCategoryOptions(selectedCategory = "") {
    if (!els.drinkCategory) return;
    const selected = String(selectedCategory || "").trim();
    const categories = getBuilderDrinkCategories(selected);
    els.drinkCategory.innerHTML = [
      `<option value="">Select category…</option>`,
      ...categories.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`),
    ].join("");
    els.drinkCategory.value = selected;
  }

  function countDrinksInCategoryByKey(categoryKey) {
    const uniqueDrinkKeys = new Set();
    const key = String(categoryKey || "");
    if (!key) return 0;
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      if (drinkCategoryKey(d.category) !== key) continue;
      const drinkKey = familyKeyOf(d.name || "") || String(d.id || id || "");
      if (drinkKey) uniqueDrinkKeys.add(drinkKey);
    }
    return uniqueDrinkKeys.size;
  }

  function findStoredCategoryByKey(categoryKey) {
    ensureCategoryStore();
    const key = String(categoryKey || "");
    return state.categories.order.find((name) => drinkCategoryKey(name) === key) || "";
  }

  function renderCategoryManagerList() {
    if (!els.categoryManagerListWrap) return;
    ensureCategoryStore();
    if (!state.categories.order.length) {
      els.categoryManagerListWrap.innerHTML = `<div class="muted small">No categories yet. Add one above.</div>`;
      return;
    }
	    const rows = state.categories.order
	      .map((name) => {
	        const key = drinkCategoryKey(name);
	        const used = countDrinksInCategoryByKey(key);
	        return `
	          <tr>
	            <td>
	              <input class="js-category-row-name" data-category-key="${escapeAttr(key)}" value="${escapeAttr(name)}" />
	            </td>
	            <td class="right mono">${used}</td>
	            <td class="right">
	              <button class="btn small" type="button" data-category-action="save" data-category-key="${escapeAttr(key)}">Save</button>
	              <button class="btn danger small" type="button" data-category-action="delete" data-category-key="${escapeAttr(key)}">Delete</button>
	            </td>
	          </tr>
	        `;
	      })
      .join("");
    els.categoryManagerListWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="right">Drinks</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function openCategoryManagerModal() {
    if (!els.modalCategoryManager) return;
    ensureCategoryStore();
    renderCategoryManagerList();
    if (els.categoryManagerName) els.categoryManagerName.value = "";
    els.modalCategoryManager.showModal();
  }

  function closeCategoryManagerModal() {
    if (els.modalCategoryManager?.open) els.modalCategoryManager.close();
  }

  function applyCategoryRename(oldKey, nextName) {
    const oldCategoryKey = String(oldKey || "");
    const newName = String(nextName || "").trim();
    if (!oldCategoryKey || !newName) return false;
    const newKey = drinkCategoryKey(newName);
    ensureCategoryStore();

    state.categories.order = state.categories.order.filter((name) => drinkCategoryKey(name) !== oldCategoryKey);
    ensureCustomDrinkCategory(newName);

    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      if (drinkCategoryKey(d.category) === oldCategoryKey) d.category = newName;
    }
    if (drinkCategoryKey(state.ui?.draftDrink?.category || "") === oldCategoryKey) {
      state.ui.draftDrink.category = newName;
    }
    renderDrinkCategoryOptions(state.ui?.draftDrink?.category || newName);
    syncBuilderUIFromDraft();
    saveStateDebounced();
    renderLibrary();
    renderCategoryManagerList();
    return newKey !== oldCategoryKey;
  }

  function removeCategoryByKey(oldKey) {
    const categoryKey = String(oldKey || "");
    if (!categoryKey) return;
    ensureCategoryStore();
    const label = findStoredCategoryByKey(categoryKey);
    if (!label) return;

    state.categories.order = state.categories.order.filter((name) => drinkCategoryKey(name) !== categoryKey);
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      if (drinkCategoryKey(d.category) === categoryKey) d.category = "";
    }
    if (drinkCategoryKey(state.ui?.draftDrink?.category || "") === categoryKey) {
      state.ui.draftDrink.category = "";
    }

    renderDrinkCategoryOptions(state.ui?.draftDrink?.category || "");
    syncBuilderUIFromDraft();
    saveStateDebounced();
    renderLibrary();
    renderCategoryManagerList();
  }

  function addCategoryFromManagerInput() {
    const raw = els.categoryManagerName?.value || "";
    const name = String(raw).trim();
    if (!name) {
      toast("Category name is required.");
      return;
    }
    const created = ensureCustomDrinkCategory(name);
    if (els.categoryManagerName) els.categoryManagerName.value = "";
    renderCategoryManagerList();
    renderDrinkCategoryOptions(state.ui?.draftDrink?.category || "");
    saveStateDebounced();
    toast(created ? `Category created: ${name}` : "Category already exists.");
  }

  function saveCategoryRowByKey(categoryKey) {
    if (!els.categoryManagerListWrap) return;
    const key = String(categoryKey || "");
    if (!key) return;
    const input = Array.from(els.categoryManagerListWrap.querySelectorAll("input.js-category-row-name[data-category-key]")).find(
      (el) => el.getAttribute("data-category-key") === key
    );
    if (!(input instanceof HTMLInputElement)) return;
    const current = findStoredCategoryByKey(key);
    if (!current) return;
    const nextName = String(input.value || "").trim();
    if (!nextName) {
      toast("Category name is required.");
      input.focus();
      return;
    }
    if (drinkCategoryKey(nextName) === key && nextName === current) {
      toast("No changes made.");
      return;
    }
    applyCategoryRename(key, nextName);
    toast(`Category updated: ${nextName}`);
  }

  function deleteCategoryByKey(categoryKey) {
    const label = findStoredCategoryByKey(categoryKey);
    if (!label) return;
    const usedCount = countDrinksInCategoryByKey(categoryKey);
    confirmDialog({
      title: "Delete category?",
      body:
        usedCount > 0
          ? `Delete "${label}"? ${usedCount} drink(s) using this category will be set to blank.`
          : `Delete "${label}"?`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        removeCategoryByKey(categoryKey);
        toast(`Category deleted: ${label}`);
      },
    });
  }

  function recipeCategoryKey(value) {
    const key = String(value || "").trim().toLowerCase();
    return key || "__uncategorized";
  }

  function recipeCategoryLabel(value) {
    const label = String(value || "").trim();
    return label || "Uncategorized";
  }

  function getRecipeExportDrinkGroups(opts = {}) {
    const allowedCategoryKeys = opts.categoryKeys instanceof Set ? opts.categoryKeys : null;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const groups = [];
    const groupByKey = {};
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      const categoryKey = recipeCategoryKey(d.category);
      if (allowedCategoryKeys && !allowedCategoryKeys.has(categoryKey)) continue;
      const family = String(d?.name || "").trim() || "Unnamed";
      const nameKey = familyKeyOf(family) || `__${id}`;
      const flavorId = String(detectFlavorIngredientId(d) || "");
      const flavorName = flavorId ? String(state.ingredients.byId[flavorId]?.name || detectFlavorVariantName(d) || "Flavor").trim() : "";
      const key = `${nameKey}|${flavorId || ""}`;
      if (!groupByKey[key]) {
        groupByKey[key] = {
          key,
          family,
          title: flavorName ? `${family} - ${flavorName}` : family,
          ids: [],
          categoryKey,
          categoryLabel: recipeCategoryLabel(d.category),
        };
        groups.push(groupByKey[key]);
      }
      groupByKey[key].ids.push(id);
    }
    groups.sort((a, b) => collator.compare(a.title, b.title));
    return groups;
  }

  function getRecipeExportCategories() {
    const byKey = {};
    const groups = getRecipeExportDrinkGroups();
    for (const g of groups) {
      const key = g.categoryKey || "__uncategorized";
      if (!byKey[key]) {
        byKey[key] = { key, label: g.categoryLabel || "Uncategorized", drinkKeys: new Set(), groups: [] };
      }
      const familyKey = familyKeyOf(g.family || "") || g.key;
      if (familyKey) byKey[key].drinkKeys.add(familyKey);
      byKey[key].groups.push({
        key: g.key,
        title: g.title,
        displayTitle: g.family || g.title,
        checked: true,
      });
    }
    const out = Object.values(byKey).map((row) => {
      const collator2 = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      row.groups.sort((a, b) => collator2.compare(a.title, b.title));
      return {
        key: row.key,
        label: row.label,
        count: row.drinkKeys.size,
        checked: true,
        expanded: false,
        query: "",
        groups: row.groups,
      };
    });
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    out.sort((a, b) => collator.compare(a.label, b.label));
    return out;
  }

  function renderRecipeCsvCategoryList() {
    if (!els.recipeExportCategoryList) return;
    const items = recipeCsvCategoryDraft || [];
    if (!items.length) {
      els.recipeExportCategoryList.innerHTML = `<div class="muted small">No saved drinks to export.</div>`;
      return;
    }
    els.recipeExportCategoryList.innerHTML = items
      .map((item) => {
        const checked = item.checked ? "checked" : "";
        const subtitle = `${item.count} ${item.count === 1 ? "drink" : "drinks"}`;
        const expanded = !!item.expanded;
        const toggle = expanded ? "−" : "+";
        const query = String(item.query || "");
        const queryToken = normalizeSimpleLabel(query);
        const visibleGroups = (item.groups || []).filter((g) => {
          if (!queryToken) return true;
          const text = [g.displayTitle || "", g.title || ""].join(" ");
          return normalizeSimpleLabel(text).includes(queryToken);
        });
        const groupRows = visibleGroups.length
          ? visibleGroups
              .map((g) => {
                const groupChecked = g.checked ? "checked" : "";
                return `
                  <label class="check-item export-drink-item">
                    <input type="checkbox" data-export-drink-key="${escapeAttr(g.key)}" data-export-parent-cat-key="${escapeAttr(item.key)}" ${groupChecked} />
                    <div>
                      <b>${escapeHtml(g.displayTitle || g.title)}</b>
                    </div>
                  </label>
                `;
              })
              .join("")
          : `<div class="muted small">No drinks match your search.</div>`;
        return `
          <div class="export-cat-card">
            <div class="export-cat-head">
              <label class="check-item export-cat-check">
                <input type="checkbox" data-export-cat-key="${escapeAttr(item.key)}" ${checked} />
                <div>
                  <b>${escapeHtml(item.label)}</b>
                  <div class="muted small">${escapeHtml(subtitle)}</div>
                </div>
              </label>
              <button class="btn small export-toggle" type="button" data-export-cat-toggle="${escapeAttr(item.key)}" aria-expanded="${expanded ? "true" : "false"}">${toggle}</button>
            </div>
            <div class="export-cat-body ${expanded ? "" : "hidden"}">
              <input class="search export-drink-search" data-export-cat-search="${escapeAttr(item.key)}" value="${escapeAttr(query)}" placeholder="Search drinks in ${escapeAttr(item.label)}…" autocomplete="off" />
              <div class="check-grid export-drink-grid">
                ${groupRows}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function setAllRecipeExportChecks(checked) {
    const next = !!checked;
    for (const cat of recipeCsvCategoryDraft || []) {
      cat.checked = next;
      for (const g of cat.groups || []) g.checked = next;
    }
    renderRecipeCsvCategoryList();
  }

  function findRecipeExportCategoryDraft(categoryKey) {
    const key = String(categoryKey || "");
    return (recipeCsvCategoryDraft || []).find((item) => String(item.key || "") === key) || null;
  }

  function syncRecipeExportCategoryChecked(categoryKey) {
    const cat = findRecipeExportCategoryDraft(categoryKey);
    if (!cat) return;
    const total = Array.isArray(cat.groups) ? cat.groups.length : 0;
    const checked = total ? cat.groups.some((g) => !!g.checked) : false;
    cat.checked = checked;
  }

  function onRecipeExportCategoryListClick(e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const toggleBtn = target.closest("button[data-export-cat-toggle]");
    if (toggleBtn instanceof HTMLElement) {
      const key = toggleBtn.getAttribute("data-export-cat-toggle") || "";
      const cat = findRecipeExportCategoryDraft(key);
      if (!cat) return;
      cat.expanded = !cat.expanded;
      renderRecipeCsvCategoryList();
    }
  }

  function onRecipeExportCategoryListChange(e) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches('input[type="checkbox"][data-export-cat-key]')) {
      const key = target.getAttribute("data-export-cat-key") || "";
      const cat = findRecipeExportCategoryDraft(key);
      if (!cat) return;
      cat.checked = target.checked;
      for (const g of cat.groups || []) g.checked = !!target.checked;
      renderRecipeCsvCategoryList();
      return;
    }
    if (target.matches('input[type="checkbox"][data-export-drink-key][data-export-parent-cat-key]')) {
      const drinkKey = target.getAttribute("data-export-drink-key") || "";
      const parentKey = target.getAttribute("data-export-parent-cat-key") || "";
      const cat = findRecipeExportCategoryDraft(parentKey);
      if (!cat) return;
      const group = (cat.groups || []).find((g) => String(g.key || "") === drinkKey);
      if (!group) return;
      group.checked = target.checked;
      syncRecipeExportCategoryChecked(parentKey);
      renderRecipeCsvCategoryList();
    }
  }

  function onRecipeExportCategoryListInput(e) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('input[data-export-cat-search]')) return;
    const key = target.getAttribute("data-export-cat-search") || "";
    const cat = findRecipeExportCategoryDraft(key);
    if (!cat) return;
    cat.query = target.value || "";
    renderRecipeCsvCategoryList();
  }

  function openRecipeCsvExportModal(mode = "csv") {
    if (!els.modalRecipeExportCsv) return;
    recipeExportMode = mode === "pdf" ? "pdf" : "csv";
    if (els.recipeExportModalTitle) {
      els.recipeExportModalTitle.textContent =
        recipeExportMode === "pdf" ? "Export to PDF" : "Export to Google Sheets";
    }
    if (els.recipeExportModalHint) {
      els.recipeExportModalHint.textContent =
        "Choose categories, then use + to expand and search specific drinks.";
    }
    if (els.btnConfirmRecipeExportCsv) {
      els.btnConfirmRecipeExportCsv.textContent = recipeExportMode === "pdf" ? "Export PDF" : "Export CSV";
    }
    const categories = getRecipeExportCategories();
    if (!categories.length) {
      toast("No saved drinks to export.");
      return;
    }
    recipeCsvCategoryDraft = categories.map((c) => ({
      ...c,
      checked: true,
      expanded: false,
      query: "",
      groups: (c.groups || []).map((g) => ({ ...g, checked: true })),
    }));
    renderRecipeCsvCategoryList();
    els.modalRecipeExportCsv.showModal();
  }

  function closeRecipeCsvExportModal() {
    if (els.modalRecipeExportCsv?.open) els.modalRecipeExportCsv.close();
  }

  function detectMilkLineId(drink) {
    for (const it of drink?.items || []) {
      if (!it?.ingredientId) continue;
      if (!isMilkIngredientId(it.ingredientId)) continue;
      return it.lineId || "";
    }
    return "";
  }

  function detectFlavorLineId(drink) {
    for (const it of drink?.items || []) {
      if (!it?.ingredientId) continue;
      const ing = state.ingredients.byId[it.ingredientId];
      if (!ing) continue;
      if (!isFlavorIngredient(ing)) continue;
      return it.lineId || "";
    }
    return "";
  }

  function isVariantIngredientOption(ing) {
    if (!ing || ing.archived) return false;
    if (isMilkIngredient(ing) || isMilkIngredientId(ing.id)) return false;
    if (isCupLikeIngredient(ing)) return false;
    return true;
  }

  function getVariantSelectedFlavorIds() {
    const ids = Array.isArray(variantSelectedFlavorIds) ? variantSelectedFlavorIds : [];
    return ids
      .map((id) => String(id || ""))
      .filter(Boolean)
      .filter((id) => {
        const ing = state.ingredients.byId[id];
        return !!ing && isVariantIngredientOption(ing);
      });
  }

  function setVariantSelectedFlavorIds(ids) {
    const seen = new Set();
    const out = [];
    for (const raw of Array.isArray(ids) ? ids : []) {
      const id = String(raw || "");
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    variantSelectedFlavorIds = out;
  }

  function getVariantFlavorStoreKey() {
    return getVariantBaseFamilyKey();
  }

  function loadVariantFlavorsForBase() {
    const key = getVariantFlavorStoreKey();
    const stored = key && state.ui.variantFlavorByFamilyKey ? state.ui.variantFlavorByFamilyKey[key] : [];
    if (Array.isArray(stored) && stored.length) {
      setVariantSelectedFlavorIds(stored);
      return;
    }
    // Fallback: infer from existing variants if no saved selection yet
    const ids = [];
    if (key) {
      for (const id of state.drinks.order || []) {
        const d = state.drinks.byId[id];
        if (!d) continue;
        if (familyKeyOf(d.name) !== key) continue;
        const flavorId = detectFlavorIngredientId(d);
        if (flavorId) ids.push(flavorId);
      }
    }
    setVariantSelectedFlavorIds(ids);
  }

  function persistVariantFlavorsForBase() {
    const key = getVariantFlavorStoreKey();
    if (!key) return;
    if (!state.ui.variantFlavorByFamilyKey || typeof state.ui.variantFlavorByFamilyKey !== "object") {
      state.ui.variantFlavorByFamilyKey = {};
    }
    state.ui.variantFlavorByFamilyKey[key] = getVariantSelectedFlavorIds();
    saveStateDebounced();
  }

  function loadVariantQtyForBase(baseDrink) {
    const key = getVariantFlavorStoreKey();
    const stored = key && state.ui.variantQtyByFamilyKey ? state.ui.variantQtyByFamilyKey[key] : null;
    if (stored && typeof stored === "object") {
      variantQtyTextByCup = deepClone(stored);
      return;
    }
    initVariantQtyMatrixFromBase(baseDrink);
  }

  function persistVariantQtyForBase() {
    const key = getVariantFlavorStoreKey();
    if (!key) return;
    if (!state.ui.variantQtyByFamilyKey || typeof state.ui.variantQtyByFamilyKey !== "object") {
      state.ui.variantQtyByFamilyKey = {};
    }
    state.ui.variantQtyByFamilyKey[key] = deepClone(variantQtyTextByCup || {});
    saveStateDebounced();
  }

  function renderVariantFlavorChips() {
    if (!els.variantFlavorChips) return;
    const ids = getVariantSelectedFlavorIds();
    if (!ids.length) {
      els.variantFlavorChips.innerHTML = "";
      return;
    }
    els.variantFlavorChips.innerHTML = ids
      .map((id) => {
        const ing = state.ingredients.byId[id];
        const name = ing?.name ? ing.name : "[Missing flavor]";
        return `<span class="variant-chip"><button type="button" class="chip-x" data-remove-flavor-id="${escapeAttr(
          id
        )}" aria-label="Remove flavor">✕</button><span class="chip-label">${escapeHtml(name)}</span></span>`;
      })
      .join("");
  }

  function renderVariantFlavorSelect() {
    if (!els.variantFlavorSelect) return;
    const flavors = state.ingredients.order
      .map((id) => state.ingredients.byId[id])
      .filter(Boolean)
      .filter((ing) => !ing.archived)
      .filter((ing) => isVariantIngredientOption(ing))
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base", numeric: true })
      );

    if (!flavors.length) {
      els.variantFlavorSelect.innerHTML = `<option value="">No ingredients found</option>`;
      els.variantFlavorSelect.disabled = true;
      if (els.btnAddVariantFlavor) els.btnAddVariantFlavor.disabled = true;
      if (els.btnClearVariantFlavors) els.btnClearVariantFlavors.disabled = true;
      return;
    }

    els.variantFlavorSelect.innerHTML = [
      `<option value="">Add ingredient variant…</option>`,
      ...flavors.map((ing) => `<option value="${escapeAttr(ing.id)}">${escapeHtml(ing.name || "Flavor")}</option>`),
    ].join("");
    els.variantFlavorSelect.disabled = false;
    if (els.btnAddVariantFlavor) els.btnAddVariantFlavor.disabled = false;
    if (els.btnClearVariantFlavors) els.btnClearVariantFlavors.disabled = false;
  }

  function addVariantFlavor(idRaw) {
    const id = String(idRaw || "");
    if (!id) return;
    const ing = state.ingredients.byId[id];
    if (!ing || ing.archived || !isVariantIngredientOption(ing)) {
      toast("That ingredient no longer exists.");
      return;
    }
    setVariantSelectedFlavorIds([...getVariantSelectedFlavorIds(), id]);
    persistVariantFlavorsForBase();
    renderVariantFlavorChips();
    renderVariantQtyMatrix();
  }

  function removeVariantFlavor(idRaw) {
    const id = String(idRaw || "");
    if (!id) return;
    setVariantSelectedFlavorIds(getVariantSelectedFlavorIds().filter((x) => x !== id));
    persistVariantFlavorsForBase();
    renderVariantFlavorChips();
    renderVariantQtyMatrix();
  }

  function clearVariantFlavors() {
    setVariantSelectedFlavorIds([]);
    persistVariantFlavorsForBase();
    renderVariantFlavorChips();
    renderVariantQtyMatrix();
  }

  function addVariantFlavorFromSelect() {
    if (!els.variantFlavorSelect) return;
    const id = String(els.variantFlavorSelect.value || "");
    if (!id) return;
    addVariantFlavor(id);
    els.variantFlavorSelect.value = "";
  }

  function openVariantsModal() {
    syncDraftFromUI();
    els.errDrinkName.textContent = "";

    const draft = state.ui.draftDrink;
    if (!els.modalVariants) return;

    const selected = state.ui.selectedLibraryDrinkId && state.drinks.byId[state.ui.selectedLibraryDrinkId];
    if (selected && selected.name) {
      state.ui.variantBaseFamilyKey = familyKeyOf(selected.name);
    }

    renderVariantBaseSelect();
    const base = getVariantBaseDrink();
    renderVariantBasePill(base);
    loadVariantFlavorsForBase();
    loadVariantQtyForBase(base);

    renderVariantCupList(base);

    // Milk library list
    const milks = state.milks.order.map((id) => state.milks.byId[id]).filter(Boolean);
    if (!milks.length) {
      els.variantMilkList.innerHTML = `<div class="muted small">No milks found. Add them in the <b>Milk Library</b> and link to ingredients.</div>`;
    } else {
      els.variantMilkList.innerHTML = milks
        .map((m) => {
          const ing = m.ingredientId ? state.ingredients.byId[m.ingredientId] : null;
          const missing = !ing;
          const upcharge = Number(m.upchargeMills || 0);
          const subParts = [];
          subParts.push(ing ? ing.name || "Ingredient" : "Missing ingredient");
          subParts.push(upcharge > 0 ? `Upcharge ${formatMoney(upcharge)}` : "No upcharge");
          const sub = subParts.join(" • ");
          return `
            <label class="check-item ${missing ? "is-disabled" : ""}">
              <input type="checkbox" data-var-milk-id="${escapeAttr(m.id)}" ${missing ? "disabled" : "checked"} />
              <div>
                <b>${escapeHtml(m.name || "Milk")}</b>
                <div class="muted small">${escapeHtml(sub)}</div>
              </div>
            </label>
          `;
        })
        .join("");
    }

    renderVariantFlavorSelect();
    renderVariantFlavorChips();

    renderVariantQtyMatrix();

    els.modalVariants.showModal();
  }


  function initVariantQtyMatrixFromBase(draft) {
    variantQtyTextByCup = {};
    const items = Array.isArray(draft?.items) ? draft.items : [];
    for (const cupId of state.cups.order) {
      variantQtyTextByCup[cupId] = {};
      for (const it of items) {
        if (!it?.lineId) continue;
        const n = typeof it.qty === "number" ? it.qty : parseDecimalOrNull(it.qty);
        variantQtyTextByCup[cupId][it.lineId] = n == null ? "" : String(n);
      }
    }
  }

  function ensureVariantQtyForCup(cupId, items) {
    if (!cupId) return;
    if (!variantQtyTextByCup[cupId]) variantQtyTextByCup[cupId] = {};
    for (const it of items) {
      if (!it?.lineId) continue;
      if (variantQtyTextByCup[cupId][it.lineId] !== undefined) continue;
      const n = typeof it.qty === "number" ? it.qty : parseDecimalOrNull(it.qty);
      variantQtyTextByCup[cupId][it.lineId] = n == null ? "" : String(n);
    }
  }

  function variantFlavorLineId(flavorIngredientId) {
    return `flavor_${String(flavorIngredientId || "")}`;
  }

  function renderVariantQtyMatrix() {
    if (!els.variantQtyMatrixWrap) return;
    const base = getVariantBaseDrink();
    if (!base) {
      els.variantQtyMatrixWrap.innerHTML = `<div class="muted small">Select a base drink above.</div>`;
      return;
    }
    const draftItems = Array.isArray(base?.items) ? base.items : [];
    const cupIds = getSelectedVariantCupIds();
    const selectedFlavorIds = getVariantSelectedFlavorIds();
    const useSelectedFlavors = selectedFlavorIds.length > 0;
    const selectedFlavorIngs = selectedFlavorIds
      .map((id) => state.ingredients.byId[id])
      .filter(Boolean);
    const shouldStripFlavor = selectedFlavorIngs.some((ing) => isFlavorIngredient(ing));
    const baseItems = draftItems.filter((it) => {
      if (!it?.lineId) return false;
      if (!it?.ingredientId) return true;
      const ing = state.ingredients.byId[it.ingredientId];
      if (!ing) return true;
      if (useSelectedFlavors && shouldStripFlavor && isFlavorIngredient(ing)) return false;
      return true;
    });
    const flavorItems = useSelectedFlavors
      ? selectedFlavorIds.map((id) => ({ lineId: variantFlavorLineId(id), ingredientId: id, qty: 0 }))
      : [];
    const allItems = [...baseItems, ...flavorItems];

    if (!allItems.length) {
      els.variantQtyMatrixWrap.innerHTML = `<div class="muted small">No ingredient lines to edit.</div>`;
      return;
    }
    if (!cupIds.length) {
      els.variantQtyMatrixWrap.innerHTML = `<div class="muted small">Select at least one cup variant above.</div>`;
      return;
    }

    const draftFlavorLineId = useSelectedFlavors && shouldStripFlavor ? detectFlavorLineId(base) : "";
    for (const cupId of cupIds) {
      if (!variantQtyTextByCup[cupId]) variantQtyTextByCup[cupId] = {};
      if (useSelectedFlavors && selectedFlavorIds.length) {
        const fallback = draftFlavorLineId ? (variantQtyTextByCup[cupId]?.[draftFlavorLineId] ?? "") : "";
        for (const flavorId of selectedFlavorIds) {
          const lid = variantFlavorLineId(flavorId);
          if (variantQtyTextByCup[cupId][lid] === undefined) variantQtyTextByCup[cupId][lid] = fallback;
        }
      }
      ensureVariantQtyForCup(cupId, allItems);
    }

    const cupCols = cupIds
      .map((id) => state.cups.byId[id])
      .filter(Boolean)
      .map((c) => {
        const label = cupSizeLabelWithTemp(c) || String(c.name || "").trim() || "Cup";
        return { id: c.id, label };
      });

    const header = `
      <thead>
        <tr>
          <th>Ingredient</th>
          <th>Unit</th>
          ${cupCols.map((c) => `<th class="right">${escapeHtml(c.label)}</th>`).join("")}
        </tr>
      </thead>
    `;

    const rows = allItems
      .map((it) => {
        const ing = it.ingredientId ? state.ingredients.byId[it.ingredientId] : null;
        const isMissing = !!it.ingredientId && !ing;
        const ingName = ing ? ing.name : isMissing ? "[Missing ingredient]" : "Unassigned";
        const unit = ing ? unitLabel(ing) : "—";
        const lineId = it.lineId;
        return `
          <tr>
            <td class="ing-col">${escapeHtml(ingName)}</td>
            <td class="unit-col mono">${escapeHtml(unit)}</td>
            ${cupCols
              .map((c) => {
                const val = variantQtyTextByCup?.[c.id]?.[lineId] ?? "";
                return `
                  <td class="cup-col right">
                    <input
                      class="js-var-qty"
                      data-var-cup-id="${escapeAttr(c.id)}"
                      data-var-line-id="${escapeAttr(lineId)}"
                      inputmode="decimal"
                      value="${escapeAttr(val)}"
                    />
                  </td>
                `;
              })
              .join("")}
          </tr>
        `;
      })
      .join("");

    els.variantQtyMatrixWrap.innerHTML = `
      <table class="qty-matrix">
        ${header}
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function applyVariantQtyOverrides(drink, cupId) {
    if (!cupId) return;
    const map = variantQtyTextByCup?.[cupId];
    if (!map || !Array.isArray(drink?.items)) return;
    for (const it of drink.items) {
      const raw = map[it.lineId];
      const n = parseDecimalOrNull(raw);
      if (typeof n === "number") it.qty = n;
    }
  }

  function generateVariantsFromDraft() {
    syncDraftFromUI();
    els.errDrinkName.textContent = "";

    const draft = state.ui.draftDrink;
    const baseDrink = getVariantBaseDrink();
    if (!baseDrink) {
      toast("Select a base drink.");
      return;
    }
    if (!Array.isArray(baseDrink.items) || baseDrink.items.length === 0) {
      toast("Base drink has no ingredient lines.");
      return;
    }

    const cupIds = getSelectedVariantCupIds();
    const selectedMilkIds = getCheckedVariantIds(els.variantMilkList, "data-var-milk-id");
    const milkEntries = selectedMilkIds
      .map((id) => state.milks.byId[id])
      .filter((m) => m && m.ingredientId && state.ingredients.byId[m.ingredientId]);
    const flavorIds = getVariantSelectedFlavorIds();
    if (!cupIds.length) {
      toast("Select at least one cup variant.");
      return;
    }
    if (!milkEntries.length) {
      toast("Select at least one milk.");
      return;
    }

    // Persist current ingredient-variant selections for this base
    persistVariantFlavorsForBase();
    persistVariantQtyForBase();

    const milkLineId = resolveMilkLineId(baseDrink, draft, milkEntries.map((m) => m.id));
    if (!milkLineId) {
      toast("No milk line detected. Add exactly one milk ingredient line to the recipe.");
      return;
    }

    const flavorAxis = flavorIds.length ? [null, ...flavorIds] : [null];
    const total = cupIds.length * milkEntries.length * flavorAxis.length;
    const proceed = () => {
      const base = deepClone(baseDrink);
      if (!Array.isArray(base.items)) base.items = [];
      const hasLine = base.items.some((it) => it.lineId === milkLineId);
      if (!hasLine) {
        toast("Milk line not found. Close and re-open the generator and try again.");
        return;
      }
      if (flavorIds.length) {
        const selectedFlavorIngs = flavorIds.map((id) => state.ingredients.byId[id]).filter(Boolean);
        const shouldStripFlavor = selectedFlavorIngs.some((ing) => isFlavorIngredient(ing));
        if (shouldStripFlavor) {
          base.items = base.items.filter((it) => {
            const ing = it?.ingredientId ? state.ingredients.byId[it.ingredientId] : null;
            if (!ing) return true;
            return !isFlavorIngredient(ing);
          });
        }
      }

      const createdIds = [];
      let skipped = 0;
      const keyIndex = buildVariantKeyIndex();
      const newKeys = new Set();
      let firstExistingId = null;

      for (const cupId of cupIds) {
        const cup = state.cups.byId[cupId] || null;
        for (const milk of milkEntries) {
          for (const flavorId of flavorAxis) {
            const copy = deepClone(base);
            copy.id = uid("drink");
            copy.updatedAtIso = new Date().toISOString();
            if (!copy.container) copy.container = { cupId: null };
            copy.container.cupId = cupId || null;
            copy.container.cupIdsUsed = cupId ? [cupId] : [];
            copy.milkId = milk.id;

            if (cup) {
              const label = String(cup.sizeLabel || "").trim() || String(cup.name || "").trim();
              if (label) copy.sizeLabel = label;
            }

            if (!Array.isArray(copy.items)) copy.items = [];

            const milkLine = copy.items.find((it) => it.lineId === milkLineId);
            if (milkLine) milkLine.ingredientId = milk.ingredientId;

            if (flavorId) {
              const lid = variantFlavorLineId(flavorId);
              const rawQty = variantQtyTextByCup?.[cupId]?.[lid];
              const n = parseDecimalOrNull(rawQty);
              copy.items.push({
                lineId: lid,
                ingredientId: flavorId,
                qty: typeof n === "number" ? n : 0,
              });
            }

            applyVariantQtyOverrides(copy, cupId);

            const key = variantKeyForDrink(copy);
            if (key && (keyIndex.has(key) || newKeys.has(key))) {
              skipped += 1;
              if (!firstExistingId && keyIndex.has(key)) firstExistingId = keyIndex.get(key);
              continue;
            }
            if (key) newKeys.add(key);

            state.drinks.byId[copy.id] = copy;
            state.drinks.order.unshift(copy.id);
            createdIds.push(copy.id);
          }
        }
      }

      if (createdIds.length) {
        state.ui.selectedLibraryDrinkId = createdIds[0];
        const key = familyKeyOf(draft.name);
        state.ui.libraryFamilyCollapsed[key] = false;
      } else if (firstExistingId) {
        state.ui.selectedLibraryDrinkId = firstExistingId;
      }

      closeVariantsModal();
      saveState();
      renderLibrary();
      if (createdIds.length && skipped) {
        toast(`Generated ${createdIds.length} drink(s). Skipped ${skipped} duplicate(s).`);
      } else if (createdIds.length) {
        toast(`Generated ${createdIds.length} drink(s) in Library.`);
      } else {
        toast("All generated variants already exist.");
      }
    };

    if (total > 120) {
      confirmDialog({
        title: "Generate many variants?",
        body: `This will create ${total} saved drink(s) in your Library. Continue?`,
        okLabel: "Generate",
        danger: false,
        onOk: proceed,
      });
      return;
    }
    proceed();
  }

  function setCalcOpen(open) {
    if (!els.calcPanel || !els.btnToggleCalc) return;
    els.calcPanel.classList.toggle("hidden", !open);
    els.btnToggleCalc.textContent = open ? "Hide" : "Open";
    if (open) setTimeout(() => els.calcExpr?.focus(), 0);
  }

  function handleCalcKey(key) {
    if (!els.calcExpr || !els.calcResult) return;
    if (els.calcError) els.calcError.textContent = "";

    if (key === "C") {
      els.calcExpr.value = "";
      els.calcResult.textContent = "—";
      return;
    }
    if (key === "BS") {
      calcBackspace(els.calcExpr);
      return;
    }
    if (key === "=") {
      const out = calcEvaluate(els.calcExpr.value);
      if (!out.ok) {
        els.calcResult.textContent = "—";
        if (els.calcError) els.calcError.textContent = out.error || "Invalid expression.";
        return;
      }
      els.calcResult.textContent = formatCalcResultNumber(out.result);
      return;
    }

    const insert = String(key || "");
    if (!insert) return;
    calcInsertAtCursor(els.calcExpr, insert);
  }

  function calcInsertAtCursor(input, text) {
    const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    const pos = start + text.length;
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      // ignore
    }
    input.focus();
  }

  function calcBackspace(input) {
    const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    if (start !== end) {
      input.value = `${input.value.slice(0, start)}${input.value.slice(end)}`;
      try {
        input.setSelectionRange(start, start);
      } catch {}
      input.focus();
      return;
    }
    if (start <= 0) return;
    input.value = `${input.value.slice(0, start - 1)}${input.value.slice(end)}`;
    try {
      input.setSelectionRange(start - 1, start - 1);
    } catch {}
    input.focus();
  }

  function formatCalcResultNumber(n) {
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) return n.toExponential(6);
    const s = n.toFixed(10);
    return s.replace(/\.?0+$/, "");
  }

  function calcEvaluate(exprRaw) {
    let expr = String(exprRaw ?? "");
    expr = expr.replace(/[,$]/g, "");
    expr = expr.replace(/[×x]/gi, "*").replace(/[÷]/g, "/");
    if (!expr.trim()) return { ok: false, error: "Enter an expression." };
    if (expr.length > 200) return { ok: false, error: "Expression too long." };

    const tokens = [];
    let i = 0;
    let prev = "start"; // start|num|op|lparen|rparen

    const isDigit = (c) => c >= "0" && c <= "9";
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        i += 1;
        continue;
      }

      if (isDigit(ch) || ch === ".") {
        let j = i;
        let hasDot = false;
        while (j < expr.length) {
          const c = expr[j];
          if (c === ".") {
            if (hasDot) break;
            hasDot = true;
            j += 1;
            continue;
          }
          if (isDigit(c)) {
            j += 1;
            continue;
          }
          break;
        }
        const numStr = expr.slice(i, j);
        if (numStr === ".") return { ok: false, error: "Invalid number." };
        const num = Number(numStr);
        if (!Number.isFinite(num)) return { ok: false, error: "Invalid number." };
        tokens.push({ type: "num", value: num });
        prev = "num";
        i = j;
        continue;
      }

      if (ch === "(") {
        tokens.push({ type: "lparen" });
        prev = "lparen";
        i += 1;
        continue;
      }
      if (ch === ")") {
        tokens.push({ type: "rparen" });
        prev = "rparen";
        i += 1;
        continue;
      }

      if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
        const isUnary = (ch === "+" || ch === "-") && (prev === "start" || prev === "op" || prev === "lparen");
        if (isUnary) {
          if (ch === "+") {
            i += 1;
            continue;
          }
          tokens.push({ type: "op", op: "u-" });
          prev = "op";
          i += 1;
          continue;
        }
        tokens.push({ type: "op", op: ch });
        prev = "op";
        i += 1;
        continue;
      }

      return { ok: false, error: `Invalid character: "${ch}"` };
    }

    const prec = { "u-": 3, "*": 2, "/": 2, "+": 1, "-": 1 };
    const rightAssoc = { "u-": true };
    const output = [];
    const stack = [];

    for (const t of tokens) {
      if (t.type === "num") output.push(t);
      else if (t.type === "op") {
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type !== "op") break;
          const pTop = prec[top.op];
          const pCur = prec[t.op];
          if (pTop > pCur || (pTop === pCur && !rightAssoc[t.op])) output.push(stack.pop());
          else break;
        }
        stack.push(t);
      } else if (t.type === "lparen") {
        stack.push(t);
      } else if (t.type === "rparen") {
        let found = false;
        while (stack.length) {
          const top = stack.pop();
          if (top.type === "lparen") {
            found = true;
            break;
          }
          output.push(top);
        }
        if (!found) return { ok: false, error: "Mismatched parentheses." };
      }
    }

    while (stack.length) {
      const top = stack.pop();
      if (top.type === "lparen" || top.type === "rparen") return { ok: false, error: "Mismatched parentheses." };
      output.push(top);
    }

    const st = [];
    for (const t of output) {
      if (t.type === "num") st.push(t.value);
      else if (t.type === "op") {
        if (t.op === "u-") {
          if (st.length < 1) return { ok: false, error: "Invalid expression." };
          st.push(-st.pop());
          continue;
        }
        if (st.length < 2) return { ok: false, error: "Invalid expression." };
        const b = st.pop();
        const a = st.pop();
        let r = 0;
        if (t.op === "+") r = a + b;
        else if (t.op === "-") r = a - b;
        else if (t.op === "*") r = a * b;
        else if (t.op === "/") r = a / b;
        st.push(r);
      }
    }

    if (st.length !== 1 || !Number.isFinite(st[0])) return { ok: false, error: "Result is not finite." };
    return { ok: true, result: st[0] };
  }

  function applyThemeFromState() {
    const theme = state?.settings?.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    if (els.themeDark) els.themeDark.classList.toggle("is-active", theme === "dark");
    if (els.themeLight) els.themeLight.classList.toggle("is-active", theme === "light");
  }

  // ---------- Routing ----------
  function routeTo(route) {
    const nextRoute = els.views.some((v) => v.dataset.view === route) ? route : "builder";
    els.tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.route === nextRoute));
    els.views.forEach((v) => v.classList.toggle("is-active", v.dataset.view === nextRoute));
  }

  // ---------- State / persistence ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const current = migrateState(parsed);
        if (!isStateDataEmpty(current)) return current;
        const migrated = migrateCv1StateIfNeeded();
        return migrated || current;
      }
      const migrated = migrateCv1StateIfNeeded();
      if (migrated) return migrated;
      return deepClone(DEFAULT_STATE);
    } catch {
      try {
        const migrated = migrateCv1StateIfNeeded();
        if (migrated) return migrated;
      } catch {}
      return deepClone(DEFAULT_STATE);
    }
  }

  function isStateDataEmpty(candidate) {
    if (!candidate || typeof candidate !== "object") return true;
    const ingredientCount = Object.keys(candidate?.ingredients?.byId || {}).length;
    const milkCount = Object.keys(candidate?.milks?.byId || {}).length;
    const cupCount = Object.keys(candidate?.cups?.byId || {}).length;
    const drinkCount = Object.keys(candidate?.drinks?.byId || {}).length;
    return ingredientCount + milkCount + cupCount + drinkCount === 0;
  }

  function migrateCv1StateIfNeeded() {
    try {
      if (localStorage.getItem(CV2_MIGRATION_MARKER_KEY) === "1") return null;
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyRaw) return null;
      const legacyParsed = JSON.parse(legacyRaw);
      const migrated = migrateState(legacyParsed);
      if (isStateDataEmpty(migrated)) return null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      const legacyCategoriesRaw = localStorage.getItem(LEGACY_INGREDIENT_CATEGORY_KEY);
      const cv2CategoriesRaw = localStorage.getItem(CV2_INGREDIENT_CATEGORY_KEY);
      if (legacyCategoriesRaw && !cv2CategoriesRaw) {
        localStorage.setItem(CV2_INGREDIENT_CATEGORY_KEY, legacyCategoriesRaw);
      }
      localStorage.setItem(CV2_MIGRATION_MARKER_KEY, "1");
      return migrated;
    } catch {
      return null;
    }
  }

  function migrateState(maybe) {
    const s = deepClone(DEFAULT_STATE);
    if (!maybe || typeof maybe !== "object") return s;
    if (maybe.meta && typeof maybe.meta === "object") {
      s.meta.currency = typeof maybe.meta.currency === "string" ? maybe.meta.currency : s.meta.currency;
      s.meta.lastSavedAtIso =
        typeof maybe.meta.lastSavedAtIso === "string" ? maybe.meta.lastSavedAtIso : null;
      s.meta.upchargeSelectionMigrationDone = !!maybe.meta.upchargeSelectionMigrationDone;
      s.meta.version = STATE_VERSION;
    }
	    if (maybe.settings && typeof maybe.settings === "object") {
	      s.settings = { ...maybe.settings };
	    }
	    if (s.settings.ccFeePct == null) s.settings.ccFeePct = DEFAULT_STATE.settings.ccFeePct;
	    if (s.settings.ccFeeFixedMills == null) s.settings.ccFeeFixedMills = DEFAULT_STATE.settings.ccFeeFixedMills;
	    if (s.settings.theme !== "light" && s.settings.theme !== "dark") s.settings.theme = DEFAULT_STATE.settings.theme;
	    if (s.settings.taxMode !== "inclusive" && s.settings.taxMode !== "additive") s.settings.taxMode = DEFAULT_STATE.settings.taxMode;
	    if (maybe.ingredients && typeof maybe.ingredients === "object") {
	      s.ingredients.byId = maybe.ingredients.byId && typeof maybe.ingredients.byId === "object" ? maybe.ingredients.byId : {};
	      s.ingredients.order = Array.isArray(maybe.ingredients.order) ? maybe.ingredients.order : [];
	    }
    if (maybe.milks && typeof maybe.milks === "object") {
      s.milks.byId = maybe.milks.byId && typeof maybe.milks.byId === "object" ? maybe.milks.byId : {};
      s.milks.order = Array.isArray(maybe.milks.order) ? maybe.milks.order : [];
    }
    if (maybe.modifiers && typeof maybe.modifiers === "object") {
      s.modifiers.byId = maybe.modifiers.byId && typeof maybe.modifiers.byId === "object" ? maybe.modifiers.byId : {};
      s.modifiers.order = Array.isArray(maybe.modifiers.order) ? maybe.modifiers.order : [];
    }
    if (maybe.milkCategories && typeof maybe.milkCategories === "object") {
      s.milkCategories = { ...maybe.milkCategories };
    }
    if (maybe.cups && typeof maybe.cups === "object") {
      s.cups.byId = maybe.cups.byId && typeof maybe.cups.byId === "object" ? maybe.cups.byId : {};
      s.cups.order = Array.isArray(maybe.cups.order) ? maybe.cups.order : [];
    }
	    if (maybe.drinks && typeof maybe.drinks === "object") {
	      s.drinks.byId = maybe.drinks.byId && typeof maybe.drinks.byId === "object" ? maybe.drinks.byId : {};
	      s.drinks.order = Array.isArray(maybe.drinks.order) ? maybe.drinks.order : [];
	    }
    if (maybe.categories && typeof maybe.categories === "object") {
      s.categories = { ...maybe.categories };
    }
	    if (!s.categories || typeof s.categories !== "object") s.categories = { order: [] };
	    if (!Array.isArray(s.categories.order)) s.categories.order = [];
	    {
	      const seenCategories = new Set();
	      const normalized = [];
	      const addCategory = (value) => {
	        const label = String(value || "").trim();
	        if (!label) return;
	        const key = drinkCategoryKey(label);
	        if (seenCategories.has(key)) return;
	        seenCategories.add(key);
	        normalized.push(label);
	      };
	      for (const raw of s.categories.order) addCategory(raw);
	      for (const drinkId of s.drinks.order || []) addCategory(s.drinks.byId[drinkId]?.category);
	      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
	      normalized.sort((a, b) => collator.compare(a, b));
	      s.categories.order = normalized;
	    }
    if (!s.milkCategories || typeof s.milkCategories !== "object") s.milkCategories = { order: [] };
    if (!Array.isArray(s.milkCategories.order)) s.milkCategories.order = [];
	    if (maybe.ui && typeof maybe.ui === "object") {
	      s.ui = { ...s.ui, ...maybe.ui };
	    }
	    if (!s.ui.draftDrink) s.ui.draftDrink = blankDrinkDraft();
	    if (typeof s.ui.draftBaselineDrinkId !== "string") s.ui.draftBaselineDrinkId = "";
	    if (typeof s.ui.draftBaselineJson !== "string") s.ui.draftBaselineJson = "";
	    if (typeof s.ui.selectedLibraryFamilyKey !== "string") s.ui.selectedLibraryFamilyKey = "";
    if (s.ui.libraryDetailMode !== "family" && s.ui.libraryDetailMode !== "drink") s.ui.libraryDetailMode = "drink";
	    if (s.ui.libraryDescMode !== "simple" && s.ui.libraryDescMode !== "detailed") s.ui.libraryDescMode = "detailed";
	    if (s.ui.librarySortMode !== "family" && s.ui.librarySortMode !== "category" && s.ui.librarySortMode !== "type") {
      s.ui.librarySortMode = "family";
    }
	    if (!s.ui.libraryFamilyCollapsed || typeof s.ui.libraryFamilyCollapsed !== "object") {
	      s.ui.libraryFamilyCollapsed = {};
	    }
    if (!Array.isArray(s.ui.librarySelectedDrinkIds)) s.ui.librarySelectedDrinkIds = [];
    if (typeof s.ui.variantBaseFamilyKey !== "string") s.ui.variantBaseFamilyKey = "";
    if (!s.ui.variantFlavorByFamilyKey || typeof s.ui.variantFlavorByFamilyKey !== "object") {
      s.ui.variantFlavorByFamilyKey = {};
    }
    if (!s.ui.variantQtyByFamilyKey || typeof s.ui.variantQtyByFamilyKey !== "object") {
      s.ui.variantQtyByFamilyKey = {};
    }
    if (!s.ui.squareSalesReport || typeof s.ui.squareSalesReport !== "object") {
      s.ui.squareSalesReport = null;
    }
    if (!s.ui.squareSalesCollapsed || typeof s.ui.squareSalesCollapsed !== "object") {
      s.ui.squareSalesCollapsed = { matched: false, unmatched: false };
    } else {
      s.ui.squareSalesCollapsed = {
        matched: !!s.ui.squareSalesCollapsed.matched,
        unmatched: !!s.ui.squareSalesCollapsed.unmatched,
      };
    }
    if (!s.ui.aiCsvReport || typeof s.ui.aiCsvReport !== "object") {
      s.ui.aiCsvReport = null;
    }
    if (!s.ui.aiCsvDraft || typeof s.ui.aiCsvDraft !== "object") {
      const legacySquareDraft = maybe?.ui?.squareApiDraft;
      s.ui.aiCsvDraft = {
        includeRaw: !!legacySquareDraft?.includeRaw,
      };
    } else {
      s.ui.aiCsvDraft = {
        includeRaw: !!s.ui.aiCsvDraft.includeRaw,
      };
    }
    if (typeof s.ui.milkSearch !== "string") s.ui.milkSearch = "";
    if (typeof s.ui.modifierSearch !== "string") s.ui.modifierSearch = "";
    if (!s.ui.libraryModifierScenarioByDrink || typeof s.ui.libraryModifierScenarioByDrink !== "object") {
      s.ui.libraryModifierScenarioByDrink = {};
    }
    if (!Array.isArray(s.ui.milkLibrarySuppressedIngredientIds)) s.ui.milkLibrarySuppressedIngredientIds = [];

    if (!s.modifiers || typeof s.modifiers !== "object") s.modifiers = { byId: {}, order: [] };
    if (!s.modifiers.byId || typeof s.modifiers.byId !== "object") s.modifiers.byId = {};
    if (!Array.isArray(s.modifiers.order)) s.modifiers.order = [];
    for (const id of Object.keys(s.modifiers.byId || {})) {
      const mod = s.modifiers.byId[id];
      if (!mod || typeof mod !== "object") continue;
      if (!mod.id) mod.id = id;
      if (mod.type === undefined || mod.type === null) mod.type = "";
      if (mod.aliasesText === undefined || mod.aliasesText === null) mod.aliasesText = "";
      if (mod.defaultQty === undefined || mod.defaultQty === null) mod.defaultQty = 1;
      if (mod.costDeltaMills === undefined || mod.costDeltaMills === null) mod.costDeltaMills = 0;
      if (mod.priceDeltaMills === undefined || mod.priceDeltaMills === null) mod.priceDeltaMills = 0;
      if (mod.notes === undefined || mod.notes === null) mod.notes = "";
      if (mod.archived === undefined) mod.archived = false;
      if (!mod.updatedAtIso) mod.updatedAtIso = new Date().toISOString();
    }
    {
      const seenModifierIds = new Set();
      const normalizedOrder = [];
      for (const id of s.modifiers.order || []) {
        const key = String(id || "");
        if (!key || !s.modifiers.byId[key] || seenModifierIds.has(key)) continue;
        seenModifierIds.add(key);
        normalizedOrder.push(key);
      }
      for (const id of Object.keys(s.modifiers.byId || {})) {
        const key = String(id || "");
        if (!key || seenModifierIds.has(key)) continue;
        seenModifierIds.add(key);
        normalizedOrder.push(key);
      }
      s.modifiers.order = normalizedOrder;
    }

	    // Ingredient field migration/defaults
	    for (const id of Object.keys(s.ingredients.byId || {})) {
	      const ing = s.ingredients.byId[id];
	      if (!ing || typeof ing !== "object") continue;
	      if (!ing.id) ing.id = id;
      if (ing.unitKey === "coffee_pricing") {
        if (ing.purchaseAmountUnitKey === undefined) ing.purchaseAmountUnitKey = null;
      } else if (!ing.purchaseAmountUnitKey) {
        ing.purchaseAmountUnitKey = ing.unitKey === "custom" ? "each" : (ing.unitKey || "g");
	      }
	      if (ing.coffeePricePerLbMills === undefined) ing.coffeePricePerLbMills = null;
	      if (ing.coffeeDoseGrams === undefined) ing.coffeeDoseGrams = null;
      if (ing.unitCostOverrideMills === undefined) ing.unitCostOverrideMills = null;
	      if (ing.upchargeMills === undefined || ing.upchargeMills === null) ing.upchargeMills = 0;
	    }

    // Milk library migration/defaults
    if (!s.milks || typeof s.milks !== "object") s.milks = { byId: {}, order: [] };
    if (!s.milks.byId || typeof s.milks.byId !== "object") s.milks.byId = {};
    if (!Array.isArray(s.milks.order)) s.milks.order = [];
    for (const id of Object.keys(s.milks.byId || {})) {
      const milk = s.milks.byId[id];
      if (!milk || typeof milk !== "object") continue;
      if (!milk.id) milk.id = id;
      if (milk.upchargeMills === undefined || milk.upchargeMills === null) milk.upchargeMills = 0;
      if (milk.ingredientId === undefined) milk.ingredientId = null;
      if (milk.category === undefined || milk.category === null) milk.category = "";
    }
    {
      const seenCategories = new Set();
      const normalized = [];
      const addCategory = (value) => {
        const label = String(value || "").trim();
        if (!label) return;
        const key = milkCategoryKey(label);
        if (seenCategories.has(key)) return;
        seenCategories.add(key);
        normalized.push(label);
      };
      for (const raw of s.milkCategories.order) addCategory(raw);
      for (const id of Object.keys(s.milks.byId || {})) addCategory(s.milks.byId[id]?.category);
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      normalized.sort((a, b) => collator.compare(a, b));
      s.milkCategories.order = normalized;
    }
    if (!s.milks.order.length) {
      const seen = new Set();
      for (const ingId of s.ingredients.order || []) {
        const ing = s.ingredients.byId[ingId];
        if (!ing || ing.archived) continue;
        if (!isMilkIngredient(ing)) continue;
        const id = `milk_from_${ing.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        s.milks.byId[id] = {
          id,
          name: ing.name || "Milk",
          ingredientId: ing.id,
          category: "",
          upchargeMills: 0,
          notes: "",
          updatedAtIso: ing.updatedAtIso || new Date().toISOString(),
        };
        s.milks.order.push(id);
      }
    }

    const inferCupTempFromDrinks = (cupId) => {
      let hot = 0;
      let iced = 0;
      for (const drinkId of s.drinks.order || []) {
        const d = s.drinks.byId[drinkId];
        if (!d) continue;
        const usesCup =
          String(d?.container?.cupId || "") === cupId ||
          (Array.isArray(d?.container?.cupIdsUsed) && d.container.cupIdsUsed.includes(cupId));
        if (!usesCup) continue;
        const detected = inferCupTempKeyFromText(`${d?.sizeLabel || ""} ${d?.name || ""}`);
        if (detected === "hot") hot += 1;
        if (detected === "iced") iced += 1;
      }
      if (!hot && !iced) return "";
      return iced > hot ? "iced" : "hot";
    };

    // Cup migration/defaults + migrate old drink cupIngredientId -> cupId
    for (const id of Object.keys(s.cups.byId || {})) {
      const cup = s.cups.byId[id];
      if (!cup || typeof cup !== "object") continue;
      if (!cup.id) cup.id = id;
      if (cup.eachCostOverrideMills === undefined) cup.eachCostOverrideMills = null;
      cup.tempKey = cupTempKey(cup) || inferCupTempFromDrinks(id) || "hot";
    }
    const cupIdByOldIngredientId = {};
    for (const ingId of s.ingredients.order || []) {
      const ing = s.ingredients.byId[ingId];
      if (!ing) continue;
      if (!isCupLikeIngredient(ing)) continue;
      const cupId = `cup_from_${ing.id}`;
      cupIdByOldIngredientId[ing.id] = cupId;
      if (!s.cups.byId[cupId]) {
        s.cups.byId[cupId] = {
          id: cupId,
          name: ing.name || "Cup",
          sizeLabel: "",
          tempKey: inferCupTempKeyFromText(ing.name || "") || "hot",
          purchasePriceMills: Number(ing.purchasePriceMills || 0),
          purchaseQtyEach: Number(ing.purchaseAmount || 0) || 0,
          notes: ing.notes || "",
          updatedAtIso: ing.updatedAtIso || new Date().toISOString(),
        };
        s.cups.order.unshift(cupId);
      }
    }
    const migrateDrinkCup = (d) => {
      if (!d || typeof d !== "object") return;
      if (!d.container) d.container = { cupId: null, cupIdsUsed: [] };

      if (!d.container.cupId) {
        const old = d.container.cupIngredientId;
        if (old && cupIdByOldIngredientId[old]) {
          d.container.cupId = cupIdByOldIngredientId[old];
        } else if (Array.isArray(d.items)) {
          const cupLines = d.items
            .filter((it) => it && it.ingredientId && cupIdByOldIngredientId[it.ingredientId]);
          if (cupLines.length === 1) {
            const line = cupLines[0];
            d.container.cupId = cupIdByOldIngredientId[line.ingredientId];
            d.items = d.items.filter((it) => it !== line);
          }
        }
      }
      if (!Array.isArray(d.container.cupIdsUsed)) {
        d.container.cupIdsUsed = d.container.cupId ? [d.container.cupId] : [];
      }
      if (d.container.cupId && !d.container.cupIdsUsed.includes(d.container.cupId)) {
        d.container.cupIdsUsed.unshift(d.container.cupId);
      }
      if ("cupIngredientId" in d.container) delete d.container.cupIngredientId;
      if ("cupQty" in d.container) delete d.container.cupQty;
    };
    migrateDrinkCup(s.ui.draftDrink);
    for (const drinkId of s.drinks.order || []) migrateDrinkCup(s.drinks.byId[drinkId]);

    // Attach milk library ids to drinks when possible
    const milkByIngredient = {};
    for (const id of s.milks.order || []) {
      const m = s.milks.byId[id];
      if (m?.ingredientId) milkByIngredient[m.ingredientId] = m.id;
    }
    const detectMilkIngredientIdLocal = (d) => {
      for (const it of d?.items || []) {
        if (!it?.ingredientId) continue;
        if (milkByIngredient[it.ingredientId]) return it.ingredientId;
        const ing = s.ingredients.byId[it.ingredientId];
        if (!ing) continue;
        if (isMilkIngredient(ing)) return it.ingredientId;
      }
      return "";
    };
    const attachMilkId = (d) => {
      if (!d || typeof d !== "object") return;
      if (d.milkId && s.milks.byId[d.milkId]) return;
      const milkIngId = detectMilkIngredientIdLocal(d);
      if (milkIngId && milkByIngredient[milkIngId]) d.milkId = milkByIngredient[milkIngId];
    };
    attachMilkId(s.ui.draftDrink);
    for (const drinkId of s.drinks.order || []) attachMilkId(s.drinks.byId[drinkId]);

	    const ensureQtyByCup = (d) => {
	      if (!d || typeof d !== "object") return;
	      if (!d.qtyByCup || typeof d.qtyByCup !== "object") d.qtyByCup = {};
	    };
	    ensureQtyByCup(s.ui.draftDrink);
	    for (const drinkId of s.drinks.order || []) ensureQtyByCup(s.drinks.byId[drinkId]);

	    // Per-line ingredient upcharge toggle (default: preserve old behavior for existing drinks)
	    const ensureIncludeUpcharge = (d) => {
	      if (!d || typeof d !== "object") return;
	      if (!Array.isArray(d.items)) return;
	      for (const it of d.items) {
	        if (!it || typeof it !== "object") continue;
	        if (typeof it.includeUpcharge === "boolean") continue;
	        it.includeUpcharge = false;
	      }
	    };
	    ensureIncludeUpcharge(s.ui.draftDrink);
	    for (const drinkId of s.drinks.order || []) ensureIncludeUpcharge(s.drinks.byId[drinkId]);
    const ensureManualLineUpcharge = (d) => {
      if (!d || typeof d !== "object") return;
      if (!Array.isArray(d.items)) return;
      for (const it of d.items) {
        if (!it || typeof it !== "object") continue;
        if (it.manualUpchargeMills === undefined || it.manualUpchargeMills === null) it.manualUpchargeMills = 0;
      }
    };
    ensureManualLineUpcharge(s.ui.draftDrink);
    for (const drinkId of s.drinks.order || []) ensureManualLineUpcharge(s.drinks.byId[drinkId]);

    const ensureMilkUsed = (d) => {
      if (!d || typeof d !== "object") return;
      if (!Array.isArray(d.milkIdsUsed)) d.milkIdsUsed = [];
      if (typeof d.milkIdsUsedTouched !== "boolean") d.milkIdsUsedTouched = false;
      if (!Array.isArray(d.milkIdsExcluded)) d.milkIdsExcluded = [];
    };
    ensureMilkUsed(s.ui.draftDrink);
    for (const drinkId of s.drinks.order || []) ensureMilkUsed(s.drinks.byId[drinkId]);

    const ensureDraftModifierScenarioRows = (d) => {
      if (!d || typeof d !== "object") return;
      const rows = Array.isArray(d.modifierScenarioRows) ? d.modifierScenarioRows : [];
      const byId = new Map();
      for (const row of rows) {
        const modifierId = String(row?.modifierId || "");
        if (!modifierId) continue;
        const mod = s.modifiers?.byId?.[modifierId];
        if (!mod) continue;
        const defaultQty = Number(mod.defaultQty || 1) > 0 ? Number(mod.defaultQty || 1) : 1;
        const qtyRaw = Number(row?.qty);
        const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : defaultQty;
        byId.set(modifierId, { modifierId, qty });
      }
      d.modifierScenarioRows = Array.from(byId.values());
    };
    ensureDraftModifierScenarioRows(s.ui.draftDrink);
    for (const drinkId of s.drinks.order || []) {
      const d = s.drinks.byId[drinkId];
      if (d && typeof d === "object" && Object.prototype.hasOwnProperty.call(d, "modifierScenarioRows")) {
        delete d.modifierScenarioRows;
      }
    }

    // One-time reset for older data so upcharges are only applied when manually checked.
    if (!s.meta.upchargeSelectionMigrationDone) {
      const resetLineUpchargeSelection = (d) => {
        if (!d || typeof d !== "object") return;
        if (!Array.isArray(d.items)) return;
        for (const it of d.items) {
          if (!it || typeof it !== "object") continue;
          it.includeUpcharge = false;
          it.manualUpchargeMills = 0;
        }
      };
      resetLineUpchargeSelection(s.ui.draftDrink);
      for (const drinkId of s.drinks.order || []) resetLineUpchargeSelection(s.drinks.byId[drinkId]);
      s.meta.upchargeSelectionMigrationDone = true;
    }

    return s;
  }

  function saveState() {
    try {
      state.meta.lastSavedAtIso = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateMetaStatus();
      return true;
    } catch {
      toast("Save failed (localStorage not available).");
      return false;
    }
  }

  let saveTimer = null;
  function saveStateDebounced() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(), 500);
  }

  function persistAndRender() {
    saveState();
    renderAll();
  }

  // ---------- Draft management ----------
	  function ensureDraftExists() {
    if (!state.ui.draftDrink) state.ui.draftDrink = blankDrinkDraft();
    if (!state.ui.draftDrink.pricing) state.ui.draftDrink.pricing = { sellPriceMills: 0, targetMarginPct: null };
    if (!state.ui.draftDrink.container) state.ui.draftDrink.container = { cupId: null, cupIdsUsed: [] };
    if (!Array.isArray(state.ui.draftDrink.container.cupIdsUsed)) state.ui.draftDrink.container.cupIdsUsed = [];
    if (!Array.isArray(state.ui.draftDrink.milkIdsUsed)) state.ui.draftDrink.milkIdsUsed = [];
    if (typeof state.ui.draftDrink.milkIdsUsedTouched !== "boolean") state.ui.draftDrink.milkIdsUsedTouched = false;
    if (!Array.isArray(state.ui.draftDrink.milkIdsExcluded)) state.ui.draftDrink.milkIdsExcluded = [];
    if (!Array.isArray(state.ui.draftDrink.milkIdsExcluded)) state.ui.draftDrink.milkIdsExcluded = [];
    if (!Array.isArray(state.ui.draftDrink.modifierScenarioRows)) state.ui.draftDrink.modifierScenarioRows = [];
    if (!state.ui.draftDrink.qtyByCup || typeof state.ui.draftDrink.qtyByCup !== "object") {
      state.ui.draftDrink.qtyByCup = {};
    }
	    if (!state.ui.draftDrink.extra) state.ui.draftDrink.extra = { salesTaxPct: DEFAULT_SALES_TAX_PCT };
	    for (const it of state.ui.draftDrink.items || []) {
	      if (!it || typeof it !== "object") continue;
	      if (typeof it.includeUpcharge !== "boolean") it.includeUpcharge = false;
      if (it.manualUpchargeMills === undefined || it.manualUpchargeMills === null) it.manualUpchargeMills = 0;
	    }
	  }

  function blankDrinkDraft() {
    return {
      id: null,
      name: "",
      category: "",
      sizeLabel: "",
      notes: "",
      container: { cupId: null, cupIdsUsed: [] },
      milkIdsUsed: [],
      milkIdsUsedTouched: false,
      milkIdsExcluded: [],
      modifierScenarioRows: [],
      qtyByCup: {},
      items: [],
      extra: { salesTaxPct: DEFAULT_SALES_TAX_PCT },
      pricing: { sellPriceMills: 0, targetMarginPct: null },
      updatedAtIso: new Date().toISOString(),
    };
  }

  function canonicalizeDrinkForCompare(d) {
    if (!d || typeof d !== "object") return "";

    const container = d.container && typeof d.container === "object" ? d.container : { cupId: null, cupIdsUsed: [] };
    const cupId = String(container.cupId || "");
    const cupIdsUsed = Array.isArray(container.cupIdsUsed)
      ? container.cupIdsUsed.map((x) => String(x || "")).filter(Boolean).sort()
      : [];

    const milkId = String(d.milkId || "");
    const milkIdsExcluded = Array.isArray(d.milkIdsExcluded)
      ? d.milkIdsExcluded.map((x) => String(x || "")).filter(Boolean).sort()
      : [];

	    const items = Array.isArray(d.items)
	      ? d.items
	          .map((it) => ({
	            lineId: String(it?.lineId || ""),
	            ingredientId: it?.ingredientId == null ? null : String(it.ingredientId),
	            qty: typeof it?.qty === "number" && Number.isFinite(it.qty) ? Math.round(it.qty * 1e6) / 1e6 : 0,
	            includeUpcharge: !!it?.includeUpcharge,
            manualUpchargeMills: Math.max(0, Number(it?.manualUpchargeMills || 0)),
	          }))
	          .sort((a, b) => a.lineId.localeCompare(b.lineId))
	      : [];

    const qtyByCup = {};
    if (d.qtyByCup && typeof d.qtyByCup === "object") {
      for (const cId of Object.keys(d.qtyByCup).sort()) {
        const map = d.qtyByCup[cId];
        if (!map || typeof map !== "object") continue;
        const inner = {};
        for (const lineId of Object.keys(map).sort()) {
          const v = map[lineId];
          inner[lineId] = v == null ? "" : String(v);
        }
        qtyByCup[cId] = inner;
      }
    }

    return JSON.stringify({
      name: String(d.name || ""),
      category: String(d.category || ""),
      notes: String(d.notes || ""),
      sizeLabel: String(d.sizeLabel || ""),
      container: { cupId, cupIdsUsed },
      milkId,
      milkIdsExcluded,
      pricing: {
        sellPriceMills: Number(d.pricing?.sellPriceMills || 0),
        targetMarginPct: d.pricing?.targetMarginPct == null ? null : Number(d.pricing.targetMarginPct),
      },
      extra: { salesTaxPct: d.extra?.salesTaxPct == null ? null : Number(d.extra.salesTaxPct) },
      items,
      qtyByCup,
    });
  }

  function clearDraftBaseline() {
    state.ui.draftBaselineDrinkId = "";
    state.ui.draftBaselineJson = "";
  }

  function setDraftBaselineFromCurrent(drinkIdRaw = "") {
    const drinkId = String(drinkIdRaw || state.ui.draftDrink?.id || "");
    state.ui.draftBaselineDrinkId = drinkId;
    state.ui.draftBaselineJson = canonicalizeDrinkForCompare(state.ui.draftDrink);
  }

  function isDraftDirty() {
    if (!state.ui.draftBaselineJson) return false;
    const cur = canonicalizeDrinkForCompare(state.ui.draftDrink);
    return cur !== state.ui.draftBaselineJson;
  }

  function updateSaveButtonLabel() {
    if (!els.btnSaveDrink) return;
    els.btnSaveDrink.textContent = isDraftDirty() ? "Save changes" : "Save";
  }

  function syncDraftFromUI() {
    const draft = state.ui.draftDrink;
    draft.name = (els.drinkName.value || "").trim();
    draft.category = (els.drinkCategory.value || "").trim();
    draft.notes = (els.drinkNotes.value || "").trim();

    if (!draft.container) draft.container = { cupId: null, cupIdsUsed: [] };
    if (!Array.isArray(draft.container.cupIdsUsed)) draft.container.cupIdsUsed = [];
    if (draft.container.cupId && !draft.container.cupIdsUsed.includes(draft.container.cupId)) {
      draft.container.cupIdsUsed.push(draft.container.cupId);
    }
    if (draft.container.cupIdsUsed.length) {
      if (!draft.container.cupId || !draft.container.cupIdsUsed.includes(draft.container.cupId)) {
        draft.container.cupId = draft.container.cupIdsUsed[0];
      }
    } else {
      draft.container.cupId = null;
    }
    if (draft.container.cupId) syncDraftSizeLabelFromCup(draft, draft.container.cupId);

    draft.pricing.sellPriceMills = clamp(parseMoneyToMills(els.sellPrice.value), 0, Number.MAX_SAFE_INTEGER);
    const tm = parseDecimal(els.targetMargin.value);
    draft.pricing.targetMarginPct = tm > 0 ? tm : null;

    if (!draft.extra) draft.extra = { salesTaxPct: null };
    const tax = parseDecimalOrNull(els.salesTaxPct.value);
    draft.extra.salesTaxPct = tax == null ? null : clamp(tax, 0, 99.999);
    draft.updatedAtIso = new Date().toISOString();
  }

  function syncBuilderUIFromDraft() {
    const draft = state.ui.draftDrink;
    els.drinkName.value = draft.name || "";
    renderDrinkCategoryOptions(draft.category || "");
    renderBuilderCupList();
    els.drinkNotes.value = draft.notes || "";
    els.sellPrice.value = millsToMoneyInput(draft.pricing.sellPriceMills);
    els.targetMargin.value = draft.pricing.targetMarginPct == null ? "" : String(draft.pricing.targetMarginPct);
    els.salesTaxPct.value = draft.extra.salesTaxPct == null ? "" : String(draft.extra.salesTaxPct);
  }

	  function addDraftLine() {
	    state.ui.draftDrink.items.push({
      lineId: uid("line"),
      ingredientId: null,
      qty: 0,
      includeUpcharge: false,
      manualUpchargeMills: 0,
    });
	    persistAndRender();
	  }

  function updateBuilderLineCostCell(lineId) {
    const wrap = els.builderTableWrap;
    if (!wrap) return;
    const item = state.ui.draftDrink.items.find((i) => i.lineId === lineId);
    if (!item) return;

    let costEl = null;
    const nodes = wrap.querySelectorAll("[data-line-cost]");
    for (const n of nodes) {
      if (n.getAttribute("data-line-cost") === lineId) {
        costEl = n;
        break;
      }
    }
    if (!costEl) return;

    const selected = item.ingredientId ? state.ingredients.byId[item.ingredientId] : null;
    if (!selected) {
      costEl.textContent = "—";
      return;
    }
    const cpu = ingredientCostPerUnitMills(selected);
    const draft = state.ui.draftDrink;
    const cupId = draft?.container?.cupId || "";
    const qtyRaw = cupId ? getDraftCupQtyValue(draft, cupId, item.lineId, item.qty) : item.qty;
    const qty = Math.max(0, Number(parseDecimalOrNull(qtyRaw) || 0));
    const lineCost = Math.round(qty * cpu);
    costEl.textContent = formatMoney(lineCost);
  }

	  function updateDraftLine(lineId, patch, opts = {}) {
	    const item = state.ui.draftDrink.items.find((i) => i.lineId === lineId);
	    if (!item) return;
	    if (patch.qty != null) patch.qty = Math.max(0, Number(patch.qty) || 0);
	    if (
	      Object.prototype.hasOwnProperty.call(patch, "ingredientId") &&
	      !Object.prototype.hasOwnProperty.call(patch, "includeUpcharge")
	    ) {
	      patch.includeUpcharge = false;
      patch.manualUpchargeMills = 0;
	    }
    if (Object.prototype.hasOwnProperty.call(patch, "manualUpchargeMills")) {
      patch.manualUpchargeMills = clamp(Number(patch.manualUpchargeMills || 0), 0, Number.MAX_SAFE_INTEGER);
    }
	    Object.assign(item, patch);
	    if (patch.qty != null) {
	      const draft = state.ui.draftDrink;
	      const cupId = draft?.container?.cupId || "";
      if (cupId) {
        if (!draft.qtyByCup || typeof draft.qtyByCup !== "object") draft.qtyByCup = {};
        if (!draft.qtyByCup[cupId]) draft.qtyByCup[cupId] = {};
        draft.qtyByCup[cupId][lineId] = String(patch.qty);
      }
    }
    syncDraftFromUI();
    saveStateDebounced();
    if (opts.rerenderBuilderTable === false) {
      updateBuilderLineCostCell(lineId);
      renderResults();
      return;
    }
    renderBuilderAndResults();
  }

  function removeDraftLine(lineId) {
    if (state.ui.draftDrink?.qtyByCup && typeof state.ui.draftDrink.qtyByCup === "object") {
      for (const cupId of Object.keys(state.ui.draftDrink.qtyByCup)) {
        if (state.ui.draftDrink.qtyByCup[cupId]) {
          delete state.ui.draftDrink.qtyByCup[cupId][lineId];
        }
      }
    }
    state.ui.draftDrink.items = state.ui.draftDrink.items.filter((i) => i.lineId !== lineId);
    persistAndRender();
  }

  // ---------- Ingredients ----------
  function activeIngredients() {
    return state.ingredients.order
      .map((id) => state.ingredients.byId[id])
      .filter(Boolean)
      .filter((i) => !i.archived);
  }

  function ingredientUsedByCount(ingredientId) {
    let count = 0;
    for (const drinkId of state.drinks.order) {
      const d = state.drinks.byId[drinkId];
      if (!d) continue;
      if (d.items?.some((it) => it.ingredientId === ingredientId)) count += 1;
    }
    return count;
  }

  function ingredientMilkLibraryCount(ingredientId) {
    let count = 0;
    for (const milkId of state.milks.order || []) {
      if (state.milks.byId[milkId]?.ingredientId === ingredientId) count += 1;
    }
    return count;
  }

  function ingredientMilkLibraryUsedByCount(ingredientId) {
    let count = 0;
    for (const milkId of state.milks.order || []) {
      const milk = state.milks.byId[milkId];
      if (!milk || milk.ingredientId !== ingredientId) continue;
      if (milkUsedByCount(milkId) > 0) count += 1;
    }
    return count;
  }

  function setIngredientCostOverrideOpen(open) {
    const isOpen = !!open;
    if (els.wrapIngCostOverride) {
      els.wrapIngCostOverride.classList.toggle("hidden", !isOpen);
    }
    if (els.btnToggleIngCostOverride) {
      els.btnToggleIngCostOverride.textContent = isOpen ? "Disable" : "Enable";
    }
  }

  function openIngredientModal(ingredientId) {
    editingIngredientId = ingredientId;
    clearIngredientModalErrors();

	    if (!ingredientId) {
	      els.ingredientModalTitle.textContent = "New ingredient";
	      els.ingName.value = "";
	      els.ingCategory.value = "";
	      els.ingUnit.value = "g";
      ingredientModalLastUnitKey = "g";
      els.ingUnitLabel.value = "";
      els.coffeePricePerLb.value = "";
      els.coffeeDoseGrams.value = "";
      els.coffeeUnitLabel.value = "shot";
	      els.ingPurchasePrice.value = "";
		      els.ingPurchaseUnit.value = "g";
		      els.ingPurchaseAmount.value = "";
	      els.ingCostOverride.value = "";
		      els.ingUpcharge.value = "";
		      els.ingNotes.value = "";
	      els.btnDeleteIngredient.classList.add("hidden");
	      els.wrapUnitLabel.classList.add("hidden");
		      els.wrapCoffeePricing.classList.add("hidden");
		      els.wrapPurchasePrice.classList.remove("hidden");
		      els.wrapPurchaseAmount.classList.remove("hidden");
      setIngredientCostOverrideOpen(false);
		      if (ingredientModalPrefill) {
	        const pre = ingredientModalPrefill;
	        if (pre.name) els.ingName.value = pre.name;
	        if (pre.category) els.ingCategory.value = pre.category;
        if (pre.unitKey) {
          els.ingUnit.value = pre.unitKey;
          ingredientModalLastUnitKey = pre.unitKey;
          els.ingPurchaseUnit.value = pre.purchaseUnitKey || (pre.unitKey === "custom" ? "each" : pre.unitKey);
        }
        if (pre.unitLabel != null) els.ingUnitLabel.value = pre.unitLabel;
        ingredientModalPrefill = null;
        els.wrapUnitLabel.classList.toggle("hidden", els.ingUnit.value !== "custom");
	        els.wrapCoffeePricing.classList.toggle("hidden", els.ingUnit.value !== "coffee_pricing");
	        els.wrapPurchasePrice.classList.toggle("hidden", els.ingUnit.value === "coffee_pricing");
	        els.wrapPurchaseAmount.classList.toggle("hidden", els.ingUnit.value === "coffee_pricing");
	        setIngredientCostOverrideOpen(false);
	      }
	    } else {
      const ing = state.ingredients.byId[ingredientId];
      if (!ing) return;
      els.ingredientModalTitle.textContent = "Edit ingredient";
      els.ingName.value = ing.name || "";
      els.ingCategory.value = ing.category || "";
      els.ingUnit.value = ing.unitKey || "g";
      ingredientModalLastUnitKey = els.ingUnit.value;
      els.ingUnitLabel.value = ing.unitLabel || "";
      els.coffeePricePerLb.value = millsToMoneyInput(ing.coffeePricePerLbMills || 0);
      els.coffeeDoseGrams.value = ing.coffeeDoseGrams == null ? "" : String(ing.coffeeDoseGrams);
      els.coffeeUnitLabel.value = ing.unitKey === "coffee_pricing" ? (ing.unitLabel || "shot") : "shot";
	      els.ingPurchasePrice.value = millsToMoneyInput(ing.purchasePriceMills || 0);
		      els.ingPurchaseUnit.value = ing.purchaseAmountUnitKey || (ing.unitKey === "custom" ? "each" : (ing.unitKey || "g"));
		      els.ingPurchaseAmount.value = String(ing.purchaseAmount ?? "");
      els.ingCostOverride.value = millsToMoneyInput(ing.unitCostOverrideMills || 0);
		      els.ingUpcharge.value = millsToMoneyInput(ing.upchargeMills || 0);
		      els.ingNotes.value = ing.notes || "";
	      els.btnDeleteIngredient.classList.toggle(
	        "hidden",
	        ingredientUsedByCount(ingredientId) > 0 || ingredientMilkLibraryUsedByCount(ingredientId) > 0
	      );
	      els.wrapUnitLabel.classList.toggle("hidden", els.ingUnit.value !== "custom");
		      els.wrapCoffeePricing.classList.toggle("hidden", els.ingUnit.value !== "coffee_pricing");
		      els.wrapPurchasePrice.classList.toggle("hidden", els.ingUnit.value === "coffee_pricing");
		      els.wrapPurchaseAmount.classList.toggle("hidden", els.ingUnit.value === "coffee_pricing");
      setIngredientCostOverrideOpen(Number(ing.unitCostOverrideMills || 0) > 0);
		    }

    updateIngredientUnitCostPreview();
    els.modalIngredient.showModal();
    setTimeout(() => els.ingName.focus(), 50);
  }

  function closeIngredientModal() {
    editingIngredientId = null;
    if (els.modalIngredient.open) els.modalIngredient.close();
    if (pendingMilkIngredientSelect && milkModalReturnState && !skipMilkReturnOnClose) {
      reopenMilkModalAfterIngredient(milkModalReturnState.draft?.ingredientId || "");
    }
    skipMilkReturnOnClose = false;
  }

	  function clearIngredientModalErrors() {
	    els.errIngName.textContent = "";
	    els.errIngPurchaseAmount.textContent = "";
	  }

	  function updateIngredientUnitCostPreview() {
	    const unit = getUnitFromModal();
    const overrideMills = clamp(parseMoneyToMills(els.ingCostOverride.value), 0, Number.MAX_SAFE_INTEGER);
    if (overrideMills > 0) {
      els.ingUnitCost.textContent = `${formatMoneyWithDigits(overrideMills, 4)} / ${unit.label}`;
      els.ingUnitCostHint.textContent = "Manual price override per reporting unit.";
      return;
    }
	    const purchasePriceMills = clamp(parseMoneyToMills(els.ingPurchasePrice.value), 0, Number.MAX_SAFE_INTEGER);
	    const purchaseAmount = parseDecimal(els.ingPurchaseAmount.value);
	    const purchaseUnitKey = els.ingPurchaseUnit.value || (unit.key === "custom" ? "each" : unit.key);

    if (unit.key === "coffee_pricing") {
      const pricePerLbMills = clamp(parseMoneyToMills(els.coffeePricePerLb.value), 0, Number.MAX_SAFE_INTEGER);
      const doseGrams = parseDecimal(els.coffeeDoseGrams.value);
      const label = unit.label || "shot";
      const info = ingredientCostInfo({
        unitKey: "coffee_pricing",
        unitLabel: label,
        coffeePricePerLbMills: pricePerLbMills,
        coffeeDoseGrams: doseGrams,
      });
      els.ingUnitCost.textContent = `${formatMoneyWithDigits(info.costPerUnitMills, 4)} / ${label}`;
      els.ingUnitCostHint.textContent = info.hint;
      return;
    }

    if (purchasePriceMills <= 0 || !(purchaseAmount > 0)) {
      els.ingUnitCost.textContent = `${formatMoneyWithDigits(0, 4)} / ${unit.label}`;
      els.ingUnitCostHint.textContent = "Enter purchase price and amount to calculate.";
      return;
    }

    const ing = {
      unitKey: unit.key,
      unitLabel: unit.label,
      purchasePriceMills,
      purchaseAmount,
      purchaseAmountUnitKey: purchaseUnitKey,
    };
    const info = ingredientCostInfo(ing);
    els.ingUnitCost.textContent = `${formatMoneyWithDigits(info.costPerUnitMills, 4)} / ${unit.label}`;
    els.ingUnitCostHint.textContent = info.hint;
  }

  function getUnitFromModal() {
    const key = els.ingUnit.value;
    if (key === "custom") {
      const label = (els.ingUnitLabel.value || "").trim() || "unit";
      return { key: "custom", label };
    }
    if (key === "coffee_pricing") {
      const label = (els.coffeeUnitLabel.value || "").trim() || "shot";
      return { key: "coffee_pricing", label };
    }
    if (key === "oz") return { key: "oz", label: "oz" };
    if (key === "ml") return { key: "ml", label: "ml" };
    if (key === "each") return { key: "each", label: "each" };
    return { key: "g", label: "g" };
  }

  function saveIngredientFromModal() {
    clearIngredientModalErrors();

    const name = (els.ingName.value || "").trim();
    if (!name) {
      els.errIngName.textContent = "Name is required.";
      return;
    }

	    const unit = getUnitFromModal();
    const unitCostOverrideMills = clamp(parseMoneyToMills(els.ingCostOverride.value), 0, Number.MAX_SAFE_INTEGER);
    const hasCostOverride = unitCostOverrideMills > 0;
	    let purchasePriceMills = 0;
	    let purchaseAmountUnitKey = "g";
	    let purchaseAmount = 0;
    let coffeePricePerLbMills = null;
    let coffeeDoseGrams = null;
    let unitLabelForSave = unit.label;

	    if (unit.key === "coffee_pricing") {
	      coffeePricePerLbMills = clamp(parseMoneyToMills(els.coffeePricePerLb.value), 0, Number.MAX_SAFE_INTEGER);
	      coffeeDoseGrams = parseDecimal(els.coffeeDoseGrams.value);
      if (!hasCostOverride) {
	        if (!(coffeePricePerLbMills > 0)) {
	          els.errIngPurchaseAmount.textContent = "Enter a price per lb.";
	          return;
	        }
	        if (!(coffeeDoseGrams > 0)) {
	          els.errIngPurchaseAmount.textContent = "Enter grams per unit (dose).";
	          return;
	        }
	      }
	      unitLabelForSave = (els.coffeeUnitLabel.value || "").trim() || "shot";
	    } else {
	      purchasePriceMills = clamp(parseMoneyToMills(els.ingPurchasePrice.value), 0, Number.MAX_SAFE_INTEGER);
	      purchaseAmountUnitKey = els.ingPurchaseUnit.value || (unit.key === "custom" ? "each" : unit.key);
	      purchaseAmount = parseDecimal(els.ingPurchaseAmount.value);
      if (!hasCostOverride) {
	        if (!(purchaseAmount > 0)) {
	          els.errIngPurchaseAmount.textContent = "Purchase amount must be greater than 0.";
	          return;
	        }
	        const converted = convertPurchaseAmountToIngredientUnits({
	          unitKey: unit.key,
	          purchaseAmount,
	          purchaseAmountUnitKey,
	        });
	        if (!converted.ok) {
	          // Don't block save; just allow and compute 0 cost until fixed (per your request).
	          // Still show the error inline so it's obvious.
	          els.errIngPurchaseAmount.textContent = "Purchase amount/unit doesn't match reporting unit.";
	        }
	      }
		    }

	    const category = (els.ingCategory.value || "").trim();
	    const upchargeMills = clamp(parseMoneyToMills(els.ingUpcharge.value), 0, Number.MAX_SAFE_INTEGER);

	    const ing = {
	      id: editingIngredientId || uid("ing"),
	      name,
	      category,
	      unitKey: unit.key,
	      unitLabel: unitLabelForSave,
	      purchasePriceMills: unit.key === "coffee_pricing" ? 0 : purchasePriceMills,
	      purchaseAmount: unit.key === "coffee_pricing" ? 0 : purchaseAmount,
	      purchaseAmountUnitKey: unit.key === "coffee_pricing" ? null : purchaseAmountUnitKey,
		      coffeePricePerLbMills,
		      coffeeDoseGrams,
      unitCostOverrideMills: hasCostOverride ? unitCostOverrideMills : null,
		      upchargeMills,
	      // Removed fields (kept null for compatibility with older saved data)
	      densityGPerMl: null,
	      lossPct: null,
	      notes: (els.ingNotes.value || "").trim(),
	      archived: false,
      updatedAtIso: new Date().toISOString(),
    };

    const savedId = editingIngredientId || ing.id;
    if (!editingIngredientId) {
      state.ingredients.byId[ing.id] = ing;
      state.ingredients.order.unshift(ing.id);
      toast("Ingredient added.");
    } else {
      const existing = state.ingredients.byId[editingIngredientId];
      if (!existing) return;
      state.ingredients.byId[editingIngredientId] = { ...existing, ...ing, id: editingIngredientId };
      toast("Ingredient updated.");
    }

    const returnToMilk = pendingMilkIngredientSelect && milkModalReturnState;
    if (returnToMilk) skipMilkReturnOnClose = true;
    closeIngredientModal();
    persistAndRender();
    if (returnToMilk) {
      reopenMilkModalAfterIngredient(savedId);
    }
  }

  function deleteIngredientFromModal() {
    const id = editingIngredientId;
    if (!id) return;
    deleteIngredientById(id);
  }

  function deleteIngredientById(id) {
    const ing = state.ingredients.byId[id];
    if (!ing) return;
    const usedBy = ingredientUsedByCount(id);
    const linkedMilkCount = ingredientMilkLibraryCount(id);
    const linkedMilkUsedBy = ingredientMilkLibraryUsedByCount(id);
    if (usedBy > 0 || linkedMilkUsedBy > 0) {
      toast("Cannot delete: ingredient is used by saved drinks.");
      return;
    }

    const linkedMilkLabel = linkedMilkCount
      ? ` This will also remove ${linkedMilkCount} linked milk library item${linkedMilkCount === 1 ? "" : "s"}.`
      : "";
    confirmDialog({
      title: "Delete ingredient?",
      body: `Delete "${ing.name}"? This cannot be undone.${linkedMilkLabel}`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        const linkedMilkIds = state.milks.order.filter((milkId) => state.milks.byId[milkId]?.ingredientId === id);

        delete state.ingredients.byId[id];
        state.ingredients.order = state.ingredients.order.filter((x) => x !== id);

        for (const milkId of linkedMilkIds) {
          delete state.milks.byId[milkId];
        }
        state.milks.order = state.milks.order.filter((milkId) => !linkedMilkIds.includes(milkId));

        // Remove from draft lines too.
        if (state.ui?.draftDrink?.items) {
          state.ui.draftDrink.items.forEach((it) => {
            if (it.ingredientId === id) it.ingredientId = null;
          });
        }
        if (state.ui?.draftDrink?.milkId && linkedMilkIds.includes(state.ui.draftDrink.milkId)) {
          state.ui.draftDrink.milkId = null;
        }
        for (const drinkId of state.drinks.order) {
          const d = state.drinks.byId[drinkId];
          if (!d || !linkedMilkIds.includes(d.milkId)) continue;
          d.milkId = null;
        }

        if (Array.isArray(state.ui?.librarySelectedDrinkIds)) {
          state.ui.librarySelectedDrinkIds = state.ui.librarySelectedDrinkIds.filter((drinkId) => state.drinks.byId[drinkId]);
        }

        if (els.modalIngredient?.open || editingIngredientId === id) {
          closeIngredientModal();
        }
        persistAndRender();
        toast("Ingredient deleted.");
      },
    });
  }

  // ---------- Milk Library ----------
  function milkUsedByCount(milkId) {
    let count = 0;
    for (const drinkId of state.drinks.order) {
      const d = state.drinks.byId[drinkId];
      if (!d) continue;
      if (resolveMilkLibraryIdForDrink(d) === milkId) count += 1;
    }
    return count;
  }

  function ensureMilkCategoryStore() {
    if (!state.milkCategories || typeof state.milkCategories !== "object") state.milkCategories = { order: [] };
    if (!Array.isArray(state.milkCategories.order)) state.milkCategories.order = [];
  }

  function ensureCustomMilkCategory(name) {
    const label = String(name || "").trim();
    if (!label) return false;
    ensureMilkCategoryStore();
    const key = milkCategoryKey(label);
    const exists = state.milkCategories.order.some((entry) => milkCategoryKey(entry) === key);
    if (exists) return false;
    state.milkCategories.order.push(label);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    state.milkCategories.order.sort((a, b) => collator.compare(a, b));
    return true;
  }

  function getMilkCategories(extraCategory = "") {
    const seen = new Set();
    const out = [];
    const add = (value) => {
      const label = String(value || "").trim();
      if (!label) return;
      const key = milkCategoryKey(label);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(label);
    };
    ensureMilkCategoryStore();
    for (const c of state.milkCategories.order) add(c);
    for (const id of state.milks.order || []) add(state.milks.byId[id]?.category);
    add(extraCategory);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    out.sort((a, b) => collator.compare(a, b));
    return out;
  }

  function renderMilkCategoryOptions(selectedCategory = "") {
    if (!els.milkCategory) return;
    const selected = String(selectedCategory || "").trim();
    const categories = getMilkCategories(selected);
    els.milkCategory.innerHTML = [
      `<option value="">Select category…</option>`,
      ...categories.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`),
    ].join("");
    els.milkCategory.value = selected;
  }

  function countMilksInCategoryByKey(categoryKey) {
    const key = String(categoryKey || "");
    if (!key) return 0;
    let count = 0;
    for (const id of state.milks.order || []) {
      const milk = state.milks.byId[id];
      if (!milk) continue;
      if (milkCategoryKey(milk.category) === key) count += 1;
    }
    return count;
  }

  function findStoredMilkCategoryByKey(categoryKey) {
    ensureMilkCategoryStore();
    const key = String(categoryKey || "");
    return state.milkCategories.order.find((name) => milkCategoryKey(name) === key) || "";
  }

  function renderMilkCategoryManagerList() {
    if (!els.milkCategoryManagerListWrap) return;
    ensureMilkCategoryStore();
    if (!state.milkCategories.order.length) {
      els.milkCategoryManagerListWrap.innerHTML = `<div class="muted small">No categories yet. Add one above.</div>`;
      return;
    }
    const rows = state.milkCategories.order
      .map((name) => {
        const key = milkCategoryKey(name);
        const used = countMilksInCategoryByKey(key);
        return `
          <tr>
            <td><input class="js-milk-category-row-name" data-milk-category-key="${escapeAttr(key)}" value="${escapeAttr(name)}" /></td>
            <td class="right mono">${used}</td>
            <td class="right">
              <button class="btn small" type="button" data-milk-category-action="save" data-milk-category-key="${escapeAttr(key)}">Save</button>
              <button class="btn danger small" type="button" data-milk-category-action="delete" data-milk-category-key="${escapeAttr(key)}">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");
    els.milkCategoryManagerListWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="right">Milks</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function openMilkCategoryManagerModal() {
    if (!els.modalMilkCategoryManager) return;
    ensureMilkCategoryStore();
    renderMilkCategoryManagerList();
    if (els.milkCategoryManagerName) els.milkCategoryManagerName.value = "";
    els.modalMilkCategoryManager.showModal();
  }

  function closeMilkCategoryManagerModal() {
    if (els.modalMilkCategoryManager?.open) els.modalMilkCategoryManager.close();
  }

  function applyMilkCategoryRename(oldKey, nextName) {
    const oldCategoryKey = String(oldKey || "");
    const newName = String(nextName || "").trim();
    if (!oldCategoryKey || !newName) return false;
    const newKey = milkCategoryKey(newName);
    ensureMilkCategoryStore();

    state.milkCategories.order = state.milkCategories.order.filter((name) => milkCategoryKey(name) !== oldCategoryKey);
    ensureCustomMilkCategory(newName);

    for (const id of state.milks.order || []) {
      const milk = state.milks.byId[id];
      if (!milk) continue;
      if (milkCategoryKey(milk.category) === oldCategoryKey) milk.category = newName;
    }
    if (milkCategoryKey(els.milkCategory?.value || "") === oldCategoryKey) {
      renderMilkCategoryOptions(newName);
    } else {
      renderMilkCategoryOptions(els.milkCategory?.value || "");
    }
    saveStateDebounced();
    renderMilks();
    renderMilkCategoryManagerList();
    return newKey !== oldCategoryKey;
  }

  function removeMilkCategoryByKey(oldKey) {
    const categoryKey = String(oldKey || "");
    if (!categoryKey) return;
    ensureMilkCategoryStore();
    const label = findStoredMilkCategoryByKey(categoryKey);
    if (!label) return;

    state.milkCategories.order = state.milkCategories.order.filter((name) => milkCategoryKey(name) !== categoryKey);
    for (const id of state.milks.order || []) {
      const milk = state.milks.byId[id];
      if (!milk) continue;
      if (milkCategoryKey(milk.category) === categoryKey) milk.category = "";
    }

    if (milkCategoryKey(els.milkCategory?.value || "") === categoryKey) {
      renderMilkCategoryOptions("");
    } else {
      renderMilkCategoryOptions(els.milkCategory?.value || "");
    }
    saveStateDebounced();
    renderMilks();
    renderMilkCategoryManagerList();
  }

  function addMilkCategoryFromManagerInput() {
    const raw = els.milkCategoryManagerName?.value || "";
    const name = String(raw).trim();
    if (!name) {
      toast("Category name is required.");
      return;
    }
    const created = ensureCustomMilkCategory(name);
    if (els.milkCategoryManagerName) els.milkCategoryManagerName.value = "";
    renderMilkCategoryManagerList();
    renderMilkCategoryOptions(els.milkCategory?.value || "");
    saveStateDebounced();
    toast(created ? `Category created: ${name}` : "Category already exists.");
  }

  function saveMilkCategoryRowByKey(categoryKey) {
    if (!els.milkCategoryManagerListWrap) return;
    const key = String(categoryKey || "");
    if (!key) return;
    const input = Array.from(
      els.milkCategoryManagerListWrap.querySelectorAll("input.js-milk-category-row-name[data-milk-category-key]")
    ).find((el) => el.getAttribute("data-milk-category-key") === key);
    if (!(input instanceof HTMLInputElement)) return;
    const current = findStoredMilkCategoryByKey(key);
    if (!current) return;
    const nextName = String(input.value || "").trim();
    if (!nextName) {
      toast("Category name is required.");
      input.focus();
      return;
    }
    if (milkCategoryKey(nextName) === key && nextName === current) {
      toast("No changes made.");
      return;
    }
    applyMilkCategoryRename(key, nextName);
    toast(`Category updated: ${nextName}`);
  }

  function deleteMilkCategoryByKey(categoryKey) {
    const label = findStoredMilkCategoryByKey(categoryKey);
    if (!label) return;
    const usedCount = countMilksInCategoryByKey(categoryKey);
    confirmDialog({
      title: "Delete milk category?",
      body:
        usedCount > 0
          ? `Delete "${label}"? ${usedCount} milk item(s) using this category will be set to blank.`
          : `Delete "${label}"?`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        removeMilkCategoryByKey(categoryKey);
        toast(`Category deleted: ${label}`);
      },
    });
  }

  function renderMilkIngredientOptions(selectedId) {
    if (!els.milkIngredient) return;
    const candidates = state.ingredients.order
      .map((id) => state.ingredients.byId[id])
      .filter(Boolean)
      .filter((ing) => (isMilkIngredient(ing) && !ing.archived) || ing.id === selectedId);
    const missing = selectedId && !state.ingredients.byId[selectedId];

    if (!candidates.length && !missing) {
      els.milkIngredient.innerHTML = `<option value="">No milk ingredients found</option>`;
      els.milkIngredient.disabled = true;
      return;
    }

    const options = candidates
      .map((ing) => {
        const label = `${escapeHtml(ing.name || "Milk")}${ing.archived ? " (archived)" : ""}`;
        return `<option value="${escapeAttr(ing.id)}">${label}</option>`;
      })
      .join("");
    const missingOption = missing
      ? `<option value="${escapeAttr(selectedId)}" selected>[Missing ingredient]</option>`
      : "";
    els.milkIngredient.innerHTML = `<option value="">Select ingredient…</option>${missingOption}${options}`;
    els.milkIngredient.disabled = false;
    if (!missing) {
      els.milkIngredient.value = selectedId && state.ingredients.byId[selectedId] ? selectedId : "";
    }
  }

  function renderMilks() {
    if (!els.milkTableWrap) return;
    els.milkSearch.value = state.ui.milkSearch || "";
    const q = (state.ui.milkSearch || "").trim().toLowerCase();

    const rows = state.milks.order
      .map((id) => state.milks.byId[id])
      .filter(Boolean)
      .filter((m) => {
        if (!q) return true;
        const ing = m.ingredientId ? state.ingredients.byId[m.ingredientId] : null;
        const haystack = [
          m.name || "",
          m.category || "",
          m.notes || "",
          ing?.name || "",
          ing?.category || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .map((m) => {
        const ing = m.ingredientId ? state.ingredients.byId[m.ingredientId] : null;
        const usedBy = milkUsedByCount(m.id);
        const upchargeStr = formatMoney(Number(m.upchargeMills || 0));
        const ingName = ing ? ing.name || "Milk" : "[Missing ingredient]";
        const ingSub = ing ? ing.category || "—" : "Deleted / not found";
        const unit = ing ? unitLabel(ing) : "—";
        const purchaseUnit = ing
          ? purchaseUnitLabel(ing.purchaseAmountUnitKey || (ing.unitKey === "custom" ? "each" : ing.unitKey))
          : "—";
        const purchasePriceMills =
          ing && ing.unitKey === "coffee_pricing" ? Number(ing.coffeePricePerLbMills || 0) : Number(ing?.purchasePriceMills || 0);
        const purchasePriceStr =
          ing && purchasePriceMills > 0 ? `${formatMoney(purchasePriceMills)}${ing.unitKey === "coffee_pricing" ? " / lb" : ""}` : "—";
        const purchaseAmountStr =
          ing && ing.unitKey !== "coffee_pricing" && Number(ing.purchaseAmount || 0) > 0
            ? `${trimZeros(ing.purchaseAmount)} ${purchaseUnit}`
            : "—";
        const unitCostStr = ing ? `${formatMoneyWithDigits(ingredientCostPerUnitMills(ing), 4)} / ${unit}` : "—";
        const status = ing ? (ing.archived ? "Archived" : "Active") : "Missing";
        return `
          <tr>
            <td>
              <b>${escapeHtml(m.name || "Milk")}</b>
              <div class="muted small">${escapeHtml(m.notes || "—")}</div>
            </td>
            <td><span class="mono">${escapeHtml(m.category || "—")}</span></td>
            <td>
              <b>${escapeHtml(ingName)}</b>
              <div class="muted small">${escapeHtml(ingSub)}</div>
            </td>
            <td class="mono">${escapeHtml(unit)}</td>
            <td class="right mono">${purchasePriceStr}</td>
            <td class="right mono">${purchaseAmountStr}</td>
            <td class="right mono">${unitCostStr}</td>
            <td class="right mono">${upchargeStr}</td>
            <td class="right mono">${usedBy}</td>
            <td class="right mono">${status}</td>
            <td class="right">
              <button class="btn" data-action="edit" data-milk-id="${m.id}" type="button">Edit</button>
              <button class="btn danger" data-action="delete" data-milk-id="${m.id}" type="button">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");

    els.milkTableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Ingredient</th>
            <th>Unit</th>
            <th class="right">Purchase price</th>
            <th class="right">Purchase amount</th>
            <th class="right">Unit cost</th>
            <th class="right">Upcharge</th>
            <th class="right">Used by</th>
            <th class="right">Status</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            `<tr><td colspan="11" class="muted small">No milks yet. Click <b>New milk</b> to add one.</td></tr>`
          }
        </tbody>
      </table>
    `;
  }

  function clearMilkModalErrors() {
    if (els.errMilkName) els.errMilkName.textContent = "";
    if (els.errMilkIngredient) els.errMilkIngredient.textContent = "";
  }

  function cacheMilkModalDraft() {
    return {
      editingMilkId,
      name: els.milkName?.value || "",
      category: els.milkCategory?.value || "",
      ingredientId: els.milkIngredient?.value || "",
      upcharge: els.milkUpcharge?.value || "",
      notes: els.milkNotes?.value || "",
    };
  }

  function restoreMilkModalDraft(draft, selectedIngredientId) {
    if (!draft) return;
    els.milkName.value = draft.name || "";
    renderMilkCategoryOptions(draft.category || "");
    if (els.milkCategory) els.milkCategory.value = draft.category || "";
    els.milkUpcharge.value = draft.upcharge || "";
    els.milkNotes.value = draft.notes || "";
    const nextIng = selectedIngredientId != null ? selectedIngredientId : draft.ingredientId || "";
    renderMilkIngredientOptions(nextIng);
    els.milkIngredient.value = nextIng || "";
  }

  function reopenMilkModalAfterIngredient(selectedIngredientId) {
    const returnState = milkModalReturnState;
    milkModalReturnState = null;
    pendingMilkIngredientSelect = false;
    if (!returnState) return;
    openMilkModal(returnState.editingMilkId || null);
    restoreMilkModalDraft(returnState.draft, selectedIngredientId);
  }

  function startMilkIngredientFlow(mode) {
    if (mode === "edit") {
      const selected = String(els.milkIngredient.value || "");
      if (!selected) {
        els.errMilkIngredient.textContent = "Select a milk ingredient first.";
        return;
      }
    }
    milkModalReturnState = { editingMilkId, draft: cacheMilkModalDraft() };
    pendingMilkIngredientSelect = true;
    closeMilkModal();
    if (mode === "new") {
      const name = (milkModalReturnState.draft.name || "").trim();
      ingredientModalPrefill = {
        name,
        category: "Milk",
        unitKey: "oz",
        purchaseUnitKey: "oz",
      };
      openIngredientModal(null);
      return;
    }
    openIngredientModal(milkModalReturnState.draft.ingredientId);
  }

  function openMilkModal(milkId) {
    editingMilkId = milkId;
    clearMilkModalErrors();

    if (!milkId) {
      els.milkModalTitle.textContent = "New milk";
      els.milkName.value = "";
      renderMilkCategoryOptions("");
      if (els.milkCategory) els.milkCategory.value = "";
      els.milkIngredient.value = "";
      els.milkUpcharge.value = "";
      els.milkNotes.value = "";
      els.btnDeleteMilk.classList.add("hidden");
      renderMilkIngredientOptions("");
    } else {
      const milk = state.milks.byId[milkId];
      if (!milk) return;
      els.milkModalTitle.textContent = "Edit milk";
      els.milkName.value = milk.name || "";
      renderMilkCategoryOptions(milk.category || "");
      if (els.milkCategory) els.milkCategory.value = milk.category || "";
      els.milkIngredient.value = milk.ingredientId || "";
      els.milkUpcharge.value = millsToMoneyInput(milk.upchargeMills || 0);
      els.milkNotes.value = milk.notes || "";
      els.btnDeleteMilk.classList.remove("hidden");
      renderMilkIngredientOptions(milk.ingredientId || "");
    }

    els.modalMilk.showModal();
    setTimeout(() => els.milkName.focus(), 50);
  }

  function closeMilkModal() {
    editingMilkId = null;
    if (els.modalMilk?.open) els.modalMilk.close();
  }

  function saveMilkFromModal() {
    clearMilkModalErrors();
    const name = (els.milkName.value || "").trim();
    const category = (els.milkCategory?.value || "").trim();
    const ingredientId = String(els.milkIngredient.value || "");
    if (!name) {
      els.errMilkName.textContent = "Name is required.";
      return;
    }
    if (!ingredientId) {
      els.errMilkIngredient.textContent = "Select a milk ingredient.";
      return;
    }
    const dup = state.milks.order.some((id) => {
      if (id === editingMilkId) return false;
      const m = state.milks.byId[id];
      return m?.ingredientId === ingredientId;
    });
    if (dup) {
      els.errMilkIngredient.textContent = "That ingredient is already linked to another milk.";
      return;
    }
    const upchargeMills = clamp(parseMoneyToMills(els.milkUpcharge.value), 0, Number.MAX_SAFE_INTEGER);
    const notes = (els.milkNotes.value || "").trim();
    if (category) ensureCustomMilkCategory(category);

    if (!editingMilkId) {
      const id = uid("milk");
      state.milks.byId[id] = {
        id,
        name,
        category,
        ingredientId,
        upchargeMills,
        notes,
        updatedAtIso: new Date().toISOString(),
      };
      state.milks.order.unshift(id);
      unsuppressMilkLibraryIngredientId(ingredientId);
      toast("Milk added.");
    } else {
      const existing = state.milks.byId[editingMilkId];
      if (!existing) return;
      state.milks.byId[editingMilkId] = {
        ...existing,
        name,
        category,
        ingredientId,
        upchargeMills,
        notes,
        updatedAtIso: new Date().toISOString(),
      };
      unsuppressMilkLibraryIngredientId(ingredientId);
      toast("Milk updated.");
    }

    closeMilkModal();
    persistAndRender();
  }

  function deleteMilk(milkId) {
    const milk = state.milks.byId[milkId];
    if (!milk) return;
    const used = milkUsedByCount(milkId);
    const name = milk.name || "Milk";
    confirmDialog({
      title: "Delete milk?",
      body: used
        ? `"${name}" is used by ${used} drink(s). Delete anyway?`
        : `Delete "${name}"? This cannot be undone.`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        if (milk.ingredientId) suppressMilkLibraryIngredientId(milk.ingredientId);
        delete state.milks.byId[milkId];
        state.milks.order = state.milks.order.filter((id) => id !== milkId);
        for (const drinkId of state.drinks.order) {
          const d = state.drinks.byId[drinkId];
          if (!d) continue;
          if (d.milkId === milkId) d.milkId = null;
        }
        closeMilkModal();
        persistAndRender();
        toast("Milk deleted.");
      },
    });
  }

  function deleteMilkFromModal() {
    const id = editingMilkId;
    if (!id) return;
    deleteMilk(id);
  }

  // ---------- Modifiers ----------
  function modifierAliasList(modifier) {
    const list = [
      String(modifier?.name || ""),
      ...String(modifier?.aliasesText || "")
        .split(/[\n,;|]/g)
        .map((x) => String(x || "").trim()),
    ]
      .map((x) => normalizeSalesLookup(x))
      .filter(Boolean);
    return Array.from(new Set(list));
  }

  function activeModifiers() {
    return (state.modifiers?.order || [])
      .map((id) => state.modifiers.byId[id])
      .filter(Boolean)
      .filter((m) => !m.archived);
  }

  function renderModifiers() {
    if (!els.modifierTableWrap) return;
    if (els.modifierSearch) els.modifierSearch.value = state.ui.modifierSearch || "";
    const q = normalizeSimpleLabel(state.ui.modifierSearch || "");
    const rows = (state.modifiers.order || [])
      .map((id) => state.modifiers.byId[id])
      .filter(Boolean)
      .filter((m) => {
        if (!q) return true;
        const haystack = normalizeSimpleLabel([m.name || "", m.type || "", m.aliasesText || "", m.notes || ""].join(" "));
        return haystack.includes(q);
      })
      .map((m) => {
        const aliases = modifierAliasList(m).filter((alias) => alias !== normalizeSalesLookup(m.name || ""));
        return `
          <tr>
            <td>
              <b>${escapeHtml(m.name || "Modifier")}</b>
              <div class="muted small">${escapeHtml(m.notes || "—")}</div>
            </td>
            <td>${escapeHtml(m.type || "—")}</td>
            <td class="mono">${escapeHtml(aliases.join(", ") || "—")}</td>
            <td class="right mono">${formatMoney(Number(m.costDeltaMills || 0))}</td>
            <td class="right mono">${formatMoney(Number(m.priceDeltaMills || 0))}</td>
            <td class="right mono">${trimZeros(Number(m.defaultQty || 1))}</td>
            <td class="right">
              <button class="btn" data-action="edit" data-modifier-id="${escapeAttr(m.id)}" type="button">Edit</button>
              <button class="btn danger" data-action="delete" data-modifier-id="${escapeAttr(m.id)}" type="button">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");

    els.modifierTableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Modifier</th>
            <th>Type</th>
            <th>Aliases</th>
            <th class="right">Cost +</th>
            <th class="right">Price +</th>
            <th class="right">Default qty</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7" class="muted small">No modifiers yet. Click <b>New modifier</b> to add one.</td></tr>`}
        </tbody>
      </table>
    `;
  }

  function clearModifierModalErrors() {
    if (els.errModifierName) els.errModifierName.textContent = "";
  }

  function openModifierModal(modifierId) {
    if (!els.modalModifier) return;
    editingModifierId = modifierId || null;
    clearModifierModalErrors();

    if (!modifierId) {
      if (els.modifierModalTitle) els.modifierModalTitle.textContent = "New modifier";
      if (els.modifierName) els.modifierName.value = "";
      if (els.modifierType) els.modifierType.value = "";
      if (els.modifierAliases) els.modifierAliases.value = "";
      if (els.modifierDefaultQty) els.modifierDefaultQty.value = "1";
      if (els.modifierCostDelta) els.modifierCostDelta.value = "";
      if (els.modifierPriceDelta) els.modifierPriceDelta.value = "";
      if (els.modifierNotes) els.modifierNotes.value = "";
      els.btnDeleteModifier?.classList.add("hidden");
    } else {
      const modifier = state.modifiers.byId[modifierId];
      if (!modifier) return;
      if (els.modifierModalTitle) els.modifierModalTitle.textContent = "Edit modifier";
      if (els.modifierName) els.modifierName.value = modifier.name || "";
      if (els.modifierType) els.modifierType.value = modifier.type || "";
      if (els.modifierAliases) els.modifierAliases.value = modifier.aliasesText || "";
      if (els.modifierDefaultQty) {
        const defaultQty = Number(modifier.defaultQty || 1);
        els.modifierDefaultQty.value = defaultQty > 0 ? String(defaultQty) : "1";
      }
      if (els.modifierCostDelta) els.modifierCostDelta.value = millsToMoneyInput(Number(modifier.costDeltaMills || 0));
      if (els.modifierPriceDelta) els.modifierPriceDelta.value = millsToMoneyInput(Number(modifier.priceDeltaMills || 0));
      if (els.modifierNotes) els.modifierNotes.value = modifier.notes || "";
      els.btnDeleteModifier?.classList.remove("hidden");
    }

    els.modalModifier.showModal();
    setTimeout(() => els.modifierName?.focus(), 40);
  }

  function closeModifierModal() {
    editingModifierId = null;
    if (els.modalModifier?.open) els.modalModifier.close();
  }

  function saveModifierFromModal() {
    clearModifierModalErrors();
    const name = String(els.modifierName?.value || "").trim();
    if (!name) {
      if (els.errModifierName) els.errModifierName.textContent = "Modifier name is required.";
      return;
    }
    const type = String(els.modifierType?.value || "").trim();
    const aliasesText = String(els.modifierAliases?.value || "")
      .split(/[\n,;|]/g)
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .join(", ");
    const defaultQtyRaw = parseDecimal(els.modifierDefaultQty?.value || "1");
    const defaultQty = Number.isFinite(defaultQtyRaw) && defaultQtyRaw > 0 ? defaultQtyRaw : 1;
    const costDeltaMills = clamp(parseMoneyToMills(els.modifierCostDelta?.value || 0), 0, Number.MAX_SAFE_INTEGER);
    const priceDeltaMills = clamp(parseMoneyToMills(els.modifierPriceDelta?.value || 0), 0, Number.MAX_SAFE_INTEGER);
    const notes = String(els.modifierNotes?.value || "").trim();

    const next = {
      id: editingModifierId || uid("mod"),
      name,
      type,
      aliasesText,
      defaultQty,
      costDeltaMills,
      priceDeltaMills,
      notes,
      archived: false,
      updatedAtIso: new Date().toISOString(),
    };

    if (!editingModifierId) {
      state.modifiers.byId[next.id] = next;
      state.modifiers.order.unshift(next.id);
      toast("Modifier added.");
    } else {
      const existing = state.modifiers.byId[editingModifierId];
      if (!existing) return;
      state.modifiers.byId[editingModifierId] = { ...existing, ...next, id: editingModifierId };
      toast("Modifier updated.");
    }
    closeModifierModal();
    persistAndRender();
  }

  function deleteModifierById(modifierId) {
    const modifier = state.modifiers.byId[modifierId];
    if (!modifier) return;
    confirmDialog({
      title: "Delete modifier?",
      body: `Delete "${modifier.name || "modifier"}"? This cannot be undone.`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        delete state.modifiers.byId[modifierId];
        state.modifiers.order = (state.modifiers.order || []).filter((id) => id !== modifierId);
        closeModifierModal();
        persistAndRender();
        toast("Modifier deleted.");
      },
    });
  }

  function deleteModifierFromModal() {
    if (!editingModifierId) return;
    deleteModifierById(editingModifierId);
  }

  // ---------- Cups ----------
  function normalizeCupTempKey(value) {
    const key = String(value || "").trim().toLowerCase();
    if (key === "hot") return "hot";
    if (key === "iced" || key === "ice" || key === "cold") return "iced";
    return "";
  }

  function inferCupTempKeyFromText(text) {
    const sample = String(text || "").toLowerCase();
    if (/\b(iced|ice|cold)\b/.test(sample)) return "iced";
    if (/\bhot\b/.test(sample)) return "hot";
    return "";
  }

  function cupTempKey(cup) {
    if (!cup || typeof cup !== "object") return "";
    const explicit = normalizeCupTempKey(cup.tempKey);
    if (explicit) return explicit;
    return inferCupTempKeyFromText(`${cup.name || ""} ${cup.sizeLabel || ""}`);
  }

  function cupTempLabel(cupOrKey) {
    const key =
      typeof cupOrKey === "string" ? normalizeCupTempKey(cupOrKey) : cupTempKey(cupOrKey);
    if (key === "hot") return "Hot";
    if (key === "iced") return "Iced";
    return "";
  }

  function cupSizeLabelWithTemp(cup) {
    const size = String(cup?.sizeLabel || "").trim();
    const temp = cupTempLabel(cup);
    if (!size) return temp;
    if (!temp) return size;
    return new RegExp(`\\b${temp}\\b`, "i").test(size) ? size : `${size} ${temp}`;
  }

  function cupCostPerEachMills(cup) {
    const override = Number(cup?.eachCostOverrideMills || 0);
    if (override > 0) return override;
    const price = Number(cup?.purchasePriceMills || 0);
    const qty = Number(cup?.purchaseQtyEach || 0);
    if (!(price > 0) || !(qty > 0)) return 0;
    return price / qty;
  }

  function cupUsedByCount(cupId) {
    let count = 0;
    for (const drinkId of state.drinks.order) {
      const d = state.drinks.byId[drinkId];
      if (!d) continue;
      if (d.container?.cupId === cupId) count += 1;
    }
    return count;
  }

  function renderCups() {
    if (!els.cupTableWrap) return;
    els.cupSearch.value = state.ui.cupSearch || "";
    const q = (state.ui.cupSearch || "").trim().toLowerCase();

    const rows = state.cups.order
      .map((id) => state.cups.byId[id])
      .filter(Boolean)
      .filter((c) => {
        if (!q) return true;
        const tempText = cupTempLabel(c).toLowerCase();
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.sizeLabel || "").toLowerCase().includes(q) ||
          tempText.includes(q) ||
          (c.notes || "").toLowerCase().includes(q)
        );
      })
      .map((c) => {
        const cpu = cupCostPerEachMills(c);
        const usedBy = cupUsedByCount(c.id);
        const purchasePriceStr = Number(c.purchasePriceMills || 0) > 0 ? formatMoney(c.purchasePriceMills || 0) : "—";
        const purchaseQtyStr = Number(c.purchaseQtyEach || 0) > 0 ? `${trimZeros(Number(c.purchaseQtyEach || 0))} each` : "—";
        const cpuHint = Number(c.eachCostOverrideMills || 0) > 0 ? " (manual)" : "";
        return `
          <tr>
            <td>
              <b>${escapeHtml(c.name)}</b>
            </td>
            <td class="right mono">${purchasePriceStr}</td>
            <td class="right mono">${purchaseQtyStr}</td>
            <td class="right mono">${formatMoneyWithDigits(cpu, 4)} / each${cpuHint}</td>
            <td class="right mono">${usedBy}</td>
            <td class="right">
              <button class="btn" data-action="edit" data-cup-id="${c.id}" type="button">Edit</button>
              <button class="btn danger" data-action="delete" data-cup-id="${c.id}" type="button">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");

    els.cupTableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th class="right">Purchase price</th>
            <th class="right">Purchase qty</th>
            <th class="right">Cup cost</th>
            <th class="right">Used by</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            `<tr><td colspan="6" class="muted small">No cups yet. Click <b>New cup</b> to add one.</td></tr>`
          }
        </tbody>
      </table>
    `;
  }

  function openCupModal(cupId) {
    editingCupId = cupId;
    els.errCupName.textContent = "";
    els.errCupTemp.textContent = "";
    els.errCupPurchaseQty.textContent = "";

    if (!cupId) {
      els.cupModalTitle.textContent = "New cup";
      els.cupName.value = "";
      els.cupSizeLabel.value = "";
      els.cupTemp.value = "";
      els.cupPurchasePrice.value = "";
      els.cupPurchaseQty.value = "";
      els.cupEachPrice.value = "";
      els.cupNotes.value = "";
      els.btnDeleteCup.classList.add("hidden");
    } else {
      const c = state.cups.byId[cupId];
      if (!c) return;
      els.cupModalTitle.textContent = "Edit cup";
      els.cupName.value = c.name || "";
      els.cupSizeLabel.value = c.sizeLabel || "";
      els.cupTemp.value = cupTempKey(c) || "";
      els.cupPurchasePrice.value = millsToMoneyInput(c.purchasePriceMills || 0);
      els.cupPurchaseQty.value = String(c.purchaseQtyEach ?? "");
      els.cupEachPrice.value = millsToMoneyInput(c.eachCostOverrideMills || 0);
      els.cupNotes.value = c.notes || "";
      els.btnDeleteCup.classList.remove("hidden");
    }

    updateCupUnitCostPreview();
    els.modalCup.showModal();
    setTimeout(() => els.cupName.focus(), 50);
  }

  function closeCupModal() {
    editingCupId = null;
    if (els.modalCup.open) els.modalCup.close();
  }

  function updateCupUnitCostPreview() {
    const overrideMills = clamp(parseMoneyToMills(els.cupEachPrice.value), 0, Number.MAX_SAFE_INTEGER);
    if (overrideMills > 0) {
      els.cupUnitCost.textContent = `${formatMoneyWithDigits(overrideMills, 4)} / each`;
      els.cupUnitCostHint.textContent = "Manual price per cup (overrides purchase price/qty).";
      return;
    }
    const priceMills = clamp(parseMoneyToMills(els.cupPurchasePrice.value), 0, Number.MAX_SAFE_INTEGER);
    const qty = parseDecimal(els.cupPurchaseQty.value);
    if (priceMills <= 0 || !(qty > 0)) {
      els.cupUnitCost.textContent = `${formatMoneyWithDigits(0, 4)} / each`;
      els.cupUnitCostHint.textContent = "Enter purchase price and quantity to calculate.";
      return;
    }
    const cpu = priceMills / qty;
    els.cupUnitCost.textContent = `${formatMoneyWithDigits(cpu, 4)} / each`;
    els.cupUnitCostHint.textContent = "—";
  }

  function saveCupFromModal() {
    els.errCupName.textContent = "";
    els.errCupTemp.textContent = "";
    els.errCupPurchaseQty.textContent = "";

    const name = (els.cupName.value || "").trim();
    if (!name) {
      els.errCupName.textContent = "Name is required.";
      return;
    }
    const tempKey = normalizeCupTempKey(els.cupTemp.value);
    if (!tempKey) {
      els.errCupTemp.textContent = "Select Hot or Iced.";
      return;
    }
    const eachCostOverrideMills = clamp(parseMoneyToMills(els.cupEachPrice.value), 0, Number.MAX_SAFE_INTEGER) || 0;
    const purchaseQtyEach = parseDecimal(els.cupPurchaseQty.value);
    const purchaseQtyEachOrNull = purchaseQtyEach > 0 ? purchaseQtyEach : null;
    if (!(eachCostOverrideMills > 0) && !(purchaseQtyEach > 0)) {
      els.errCupPurchaseQty.textContent = "Enter a purchase quantity, or set a price per cup.";
      return;
    }

    const cup = {
      id: editingCupId || uid("cup"),
      name,
      sizeLabel: (els.cupSizeLabel.value || "").trim(),
      tempKey,
      purchasePriceMills: clamp(parseMoneyToMills(els.cupPurchasePrice.value), 0, Number.MAX_SAFE_INTEGER),
      purchaseQtyEach: purchaseQtyEachOrNull,
      eachCostOverrideMills: eachCostOverrideMills > 0 ? eachCostOverrideMills : null,
      notes: (els.cupNotes.value || "").trim(),
      updatedAtIso: new Date().toISOString(),
    };

    if (!editingCupId) {
      state.cups.byId[cup.id] = cup;
      state.cups.order.unshift(cup.id);
      toast("Cup added.");
    } else {
      const existing = state.cups.byId[editingCupId];
      if (!existing) return;
      state.cups.byId[editingCupId] = { ...existing, ...cup, id: editingCupId };
      toast("Cup updated.");
    }

    closeCupModal();
    persistAndRender();
  }

  function deleteCupFromModal() {
    const id = editingCupId;
    if (!id) return;
    deleteCup(id);
  }

  function deleteCup(cupId) {
    const c = state.cups.byId[cupId];
    if (!c) return;
    const usedBy = cupUsedByCount(cupId);
    const warn = usedBy ? ` This cup is used by ${usedBy} saved drink(s).` : "";
    confirmDialog({
      title: "Delete cup?",
      body: `Delete "${c.name}"?${warn} This cannot be undone.`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        delete state.cups.byId[cupId];
        state.cups.order = state.cups.order.filter((x) => x !== cupId);
        if (state.ui.draftDrink?.container?.cupId === cupId) state.ui.draftDrink.container.cupId = null;
        if (Array.isArray(state.ui.draftDrink?.container?.cupIdsUsed)) {
          state.ui.draftDrink.container.cupIdsUsed = state.ui.draftDrink.container.cupIdsUsed.filter((id) => id !== cupId);
        }
        for (const drinkId of state.drinks.order) {
          const d = state.drinks.byId[drinkId];
          if (d?.container?.cupId === cupId) d.container.cupId = null;
          if (Array.isArray(d?.container?.cupIdsUsed)) {
            d.container.cupIdsUsed = d.container.cupIdsUsed.filter((id) => id !== cupId);
          }
        }
        closeCupModal();
        persistAndRender();
        toast("Cup deleted.");
      },
    });
  }

  // ---------- Drinks (library) ----------
  function saveDraftToLibrary() {
    syncDraftFromUI();
    els.errDrinkName.textContent = "";

	    const draft = state.ui.draftDrink;
	    if (!draft.name) {
	      els.errDrinkName.textContent = "Drink name is required.";
	      toast("Add a drink name to save.");
	      return;
	    }
	    if (draft.category) ensureCustomDrinkCategory(draft.category);

    const keyIndex = buildVariantKeyIndex();
    const newKeys = new Set();

    const cupIds = getDraftCupIdsUsed(draft).filter((id) => !!state.cups.byId[id]);
    const cupAxis = cupIds.length ? cupIds : [draft?.container?.cupId || null];

    const milkIds = getDraftMilkIdsUsed(draft);
    const milkEntries = milkIds
      .map((id) => state.milks.byId[id])
      .filter((m) => m && m.ingredientId && state.ingredients.byId[m.ingredientId]);

    const milkLineId = milkEntries.length ? resolveMilkLineId(draft, draft, milkEntries.map((m) => m.id)) : "";
    const useMilkAxis = milkLineId && milkEntries.length;
    const milkAxis = useMilkAxis ? milkEntries : [null];

    const hadDraftId = !!draft.id && !!state.drinks.byId[draft.id];
    const baseline = (() => {
      try {
        return state.ui.draftBaselineJson ? JSON.parse(state.ui.draftBaselineJson) : null;
      } catch {
        return null;
      }
    })();
    const baselineSell = baseline?.pricing?.sellPriceMills ?? null;
    const baselineFamilyKey = familyKeyOf(baseline?.name || draft.name);
    const touchedIds = [];
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let dup = 0;

    for (const cupId of cupAxis) {
      const cup = cupId ? state.cups.byId[cupId] : null;
      for (const milk of milkAxis) {
        const copy = deepClone(draft);
        delete copy.modifierScenarioRows;
        copy.updatedAtIso = new Date().toISOString();
        if (!copy.items) copy.items = [];
        if (!copy.container) copy.container = { cupId: null, cupIdsUsed: [] };
        copy.container.cupId = cupId || null;
        copy.container.cupIdsUsed = cupId ? [cupId] : [];
        copy.qtyByCup = deepClone(draft.qtyByCup || {});

        if (cup) {
          const label = String(cup.sizeLabel || "").trim() || String(cup.name || "").trim();
          if (label) copy.sizeLabel = label;
        }

        if (cupId && copy.qtyByCup && copy.qtyByCup[cupId]) {
          for (const it of copy.items) {
            if (!it?.lineId) continue;
            const raw = copy.qtyByCup[cupId][it.lineId];
            const n = parseDecimalOrNull(raw);
            if (typeof n === "number") it.qty = n;
          }
        }

        if (useMilkAxis && milk) {
          copy.milkId = milk.id;
          const milkLine = copy.items.find((it) => it.lineId === milkLineId);
          if (milkLine) milkLine.ingredientId = milk.ingredientId;
        } else {
          const resolvedMilkId = resolveMilkLibraryIdForDrink(copy);
          copy.milkId = resolvedMilkId || null;
        }

        const key = variantKeyForDrink(copy);
        const existingId = key ? keyIndex.get(key) : null;
        if (existingId) {
          copy.id = existingId;
          const existing = state.drinks.byId[existingId];
          if (existing && canonicalizeDrinkForCompare(existing) === canonicalizeDrinkForCompare(copy)) {
            unchanged += 1;
            continue;
          }
          state.drinks.byId[existingId] = copy;
          if (!state.drinks.order.includes(existingId)) state.drinks.order.unshift(existingId);
          touchedIds.push(existingId);
          updated += 1;
          continue;
        }

        if (key && newKeys.has(key)) {
          dup += 1;
          continue;
        }
        if (key) newKeys.add(key);

        copy.id = uid("drink");
        state.drinks.byId[copy.id] = copy;
        state.drinks.order.unshift(copy.id);
        touchedIds.push(copy.id);
        created += 1;
        if (key) keyIndex.set(key, copy.id);
      }
    }

	    let familyPriceUpdated = 0;
	    const sellChanged =
	      baselineSell != null && Number(baselineSell || 0) !== Number(draft?.pricing?.sellPriceMills || 0);
	    if (hadDraftId && sellChanged && baselineFamilyKey) {
	      for (const id of state.drinks.order || []) {
        const d = state.drinks.byId[id];
        if (!d) continue;
        if (familyKeyOf(d.name) !== baselineFamilyKey) continue;
        if (!d.pricing) d.pricing = { sellPriceMills: 0, targetMarginPct: null };
        if (Number(d.pricing.sellPriceMills || 0) === Number(draft.pricing.sellPriceMills || 0)) continue;
        d.pricing.sellPriceMills = Number(draft.pricing.sellPriceMills || 0);
        d.updatedAtIso = new Date().toISOString();
	        familyPriceUpdated += 1;
	      }
	    }

    let familyCategoryUpdated = 0;
    const baselineCategoryKey = familyKeyOf(baseline?.category || "");
    const nextCategory = String(draft?.category || "").trim();
    const nextCategoryKey = familyKeyOf(nextCategory);
    const categoryChanged = hadDraftId && baseline && baselineCategoryKey !== nextCategoryKey;
    if (categoryChanged && baselineFamilyKey) {
      for (const id of state.drinks.order || []) {
        const d = state.drinks.byId[id];
        if (!d) continue;
        if (familyKeyOf(d.name) !== baselineFamilyKey) continue;
        if (familyKeyOf(d.category || "") === nextCategoryKey) continue;
        d.category = nextCategory;
        d.updatedAtIso = new Date().toISOString();
        familyCategoryUpdated += 1;
      }
    }

    if (touchedIds.length) {
      const preferred = hadDraftId && touchedIds.includes(draft.id) ? draft.id : touchedIds[0];
      state.ui.selectedLibraryDrinkId = preferred;
      state.ui.variantBaseFamilyKey = familyKeyOf(draft.name);
      if (!hadDraftId) state.ui.draftDrink.id = preferred;
    }

    setDraftBaselineFromCurrent(state.ui.draftDrink.id || "");
    persistAndRender();
    const total = created + updated;
    if (total && created && updated) toast(`Saved changes to ${updated} drink(s). Added ${created} new.`);
    else if (total && updated) toast(`Saved changes to ${updated} drink(s).`);
    else if (total && created) toast(`Saved ${created} drink(s).`);
	    else {
	      const extras = [];
	      if (unchanged) extras.push(`${unchanged} unchanged`);
	      if (dup) extras.push(`${dup} duplicate`);
	      toast(extras.length ? `No changes to save. (${extras.join(", ")})` : "No changes to save.");
	    }
	    if (familyPriceUpdated) toast(`Applied new price to ${familyPriceUpdated} other variant(s).`);
    if (familyCategoryUpdated) toast(`Applied new category to ${familyCategoryUpdated} variant(s).`);
	  }

  function loadDrinkIntoDraft(drinkId) {
    const drink = state.drinks.byId[drinkId];
    if (!drink) return;
    state.ui.draftDrink = deepClone(drink);
    if (!state.ui.draftDrink.pricing) state.ui.draftDrink.pricing = { sellPriceMills: 0, targetMarginPct: null };
    if (!state.ui.draftDrink.extra) state.ui.draftDrink.extra = { salesTaxPct: null };
    if (state.ui.draftDrink.extra.salesTaxPct === undefined) state.ui.draftDrink.extra.salesTaxPct = null;
    if (!state.ui.draftDrink.container) state.ui.draftDrink.container = { cupId: null, cupIdsUsed: [] };
    if (!Array.isArray(state.ui.draftDrink.container.cupIdsUsed)) {
      state.ui.draftDrink.container.cupIdsUsed = state.ui.draftDrink.container.cupId ? [state.ui.draftDrink.container.cupId] : [];
    }
    if (!state.ui.draftDrink.qtyByCup || typeof state.ui.draftDrink.qtyByCup !== "object") {
      state.ui.draftDrink.qtyByCup = {};
    }
    if (!Array.isArray(state.ui.draftDrink.milkIdsUsed)) state.ui.draftDrink.milkIdsUsed = [];
    if (typeof state.ui.draftDrink.milkIdsUsedTouched !== "boolean") state.ui.draftDrink.milkIdsUsedTouched = false;
    state.ui.draftDrink.modifierScenarioRows = getLibraryModifierScenarioRows(drinkId);
    if (!Array.isArray(state.ui.draftDrink.items)) state.ui.draftDrink.items = [];
    state.ui.draftDrink.items = state.ui.draftDrink.items.map((it) => ({
      lineId: it.lineId || uid("line"),
      ingredientId: it.ingredientId ?? null,
      qty: typeof it.qty === "number" ? it.qty : parseDecimal(it.qty),
      includeUpcharge: !!it.includeUpcharge,
      manualUpchargeMills: clamp(Number(it.manualUpchargeMills || 0), 0, Number.MAX_SAFE_INTEGER),
    }));
    applyActiveCupQtyToItems(state.ui.draftDrink);
    setDraftBaselineFromCurrent(drinkId);
    syncBuilderUIFromDraft();
    persistAndRender();
  }

  function duplicateDrink(drinkId) {
    const d = state.drinks.byId[drinkId];
    if (!d) return;
    const copy = deepClone(d);
    copy.id = uid("drink");
    copy.name = `${copy.name} (copy)`;
    copy.updatedAtIso = new Date().toISOString();
    state.drinks.byId[copy.id] = copy;
    state.drinks.order.unshift(copy.id);
    state.ui.selectedLibraryDrinkId = copy.id;
    persistAndRender();
    toast("Drink duplicated.");
  }

  function deleteDrink(drinkId) {
    const d = state.drinks.byId[drinkId];
    if (!d) return;
    confirmDialog({
      title: "Delete drink?",
      body: `Delete "${d.name}" from your Library? This cannot be undone.`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        delete state.drinks.byId[drinkId];
        state.drinks.order = state.drinks.order.filter((x) => x !== drinkId);
        if (state.ui.libraryModifierScenarioByDrink && typeof state.ui.libraryModifierScenarioByDrink === "object") {
          delete state.ui.libraryModifierScenarioByDrink[String(drinkId)];
        }
        if (state.ui.selectedLibraryDrinkId === drinkId) state.ui.selectedLibraryDrinkId = null;
        state.ui.librarySelectedDrinkIds = (state.ui.librarySelectedDrinkIds || []).filter((id) => id !== drinkId);
        if (state.ui.draftDrink?.id === drinkId) state.ui.draftDrink.id = null;
        persistAndRender();
        toast("Drink deleted.");
      },
    });
  }

  function toggleLibrarySelection(drinkId) {
    if (!drinkId) return;
    if (!Array.isArray(state.ui.librarySelectedDrinkIds)) state.ui.librarySelectedDrinkIds = [];
    const set = new Set(state.ui.librarySelectedDrinkIds.filter((id) => state.drinks.byId[id]));
    if (set.has(drinkId)) set.delete(drinkId);
    else set.add(drinkId);
    state.ui.librarySelectedDrinkIds = Array.from(set);
  }

  function deleteSelectedDrinks() {
    const ids = Array.isArray(state.ui.librarySelectedDrinkIds) ? state.ui.librarySelectedDrinkIds : [];
    const existing = ids.filter((id) => state.drinks.byId[id]);
    if (!existing.length) {
      state.ui.librarySelectedDrinkIds = [];
      renderLibrary();
      return;
    }

    confirmDialog({
      title: "Delete selected drinks?",
      body: `Delete ${existing.length} selected drink(s) from your Library? This cannot be undone.`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        for (const id of existing) {
          delete state.drinks.byId[id];
          if (state.ui.libraryModifierScenarioByDrink && typeof state.ui.libraryModifierScenarioByDrink === "object") {
            delete state.ui.libraryModifierScenarioByDrink[String(id)];
          }
        }
        state.drinks.order = state.drinks.order.filter((id) => state.drinks.byId[id]);
        if (existing.includes(state.ui.selectedLibraryDrinkId)) state.ui.selectedLibraryDrinkId = null;
        if (existing.includes(state.ui.draftDrink?.id)) state.ui.draftDrink.id = null;
        state.ui.librarySelectedDrinkIds = [];
        persistAndRender();
        toast(`Deleted ${existing.length} drink(s).`);
      },
    });
  }

  function libraryFamilyKeyForDrinkId(drinkId) {
    const d = state.drinks.byId[drinkId];
    if (!d) return "";
    const family = String(d?.name || "").trim() || "Unnamed";
    return familyKeyOf(family) || `__${drinkId}`;
  }

  function getLibraryFamilyDrinkIdsByKey(familyKey) {
    const key = String(familyKey || "");
    if (!key) return [];
    return state.drinks.order.filter((id) => state.drinks.byId[id] && libraryFamilyKeyForDrinkId(id) === key);
  }

  function sortCupIdsForLibraryProfile(cupIds) {
    const extractOz = (text) => {
      const m = String(text || "").match(/(\d+(?:\.\d+)?)\s*oz\b/i);
      return m ? Number(m[1]) : null;
    };
    const cupSortKey = (cupId) => {
      const cup = state.cups.byId[cupId];
      const text = cup ? `${cupSizeLabelWithTemp(cup) || ""} ${cup.name || ""}` : cupId;
      const oz = extractOz(text);
      return { oz: oz == null ? Number.POSITIVE_INFINITY : oz, text: String(text || "").toLowerCase() };
    };
    return cupIds.slice().sort((a, b) => {
      const ka = cupSortKey(a);
      const kb = cupSortKey(b);
      if (ka.oz !== kb.oz) return ka.oz - kb.oz;
      return ka.text.localeCompare(kb.text);
    });
  }

  function pickFamilyRepresentativeForCup(drinks, cupId) {
    const candidates = (drinks || [])
      .filter(Boolean)
      .filter((d) => String(d?.container?.cupId || "") === cupId || !!(d?.qtyByCup && d.qtyByCup[cupId]));
    if (!candidates.length) return null;
    const score = (d) => {
      let s = 0;
      if (String(d?.container?.cupId || "") !== cupId) s += 5;
      if (detectFlavorIngredientId(d)) s += 20;
      const milk = d?.milkId ? state.milks.byId[d.milkId] : null;
      if (milk && Number(milk.upchargeMills || 0) > 0) s += 1;
      const milkName = String(detectMilkVariantName(d) || "").toLowerCase();
      const hasWhole = /\bwhole\b/.test(milkName);
      const hasMilk = !!(resolveMilkLibraryIdForDrink(d) || detectMilkIngredientIdFromItems(d));
      if (hasWhole) s -= 1000;
      else if (hasMilk) s += 100;
      let missing = 0;
      for (const it of d?.items || []) {
        if (!it?.ingredientId) continue;
        if (!state.ingredients.byId[it.ingredientId]) missing += 1;
      }
      if (missing) s += 2;
      return s;
    };
    candidates.sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa - sb;
      const ua = String(a?.updatedAtIso || "");
      const ub = String(b?.updatedAtIso || "");
      if (ua !== ub) return ub.localeCompare(ua);
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    return candidates[0];
  }

  function qtyForDrinkItemAtCup(drink, item, cupId) {
    if (!drink || !item) return 0;
    let source = null;
    if (item.lineId) {
      source = (drink.items || []).find((it) => it?.lineId === item.lineId) || null;
    }
    if (!source && item.ingredientId) {
      source = (drink.items || []).find((it) => String(it?.ingredientId || "") === String(item.ingredientId || "")) || null;
    }
    if (!source) return 0;
    const qtyRaw =
      drink?.qtyByCup && typeof drink.qtyByCup === "object" && drink.qtyByCup[cupId] && Object.prototype.hasOwnProperty.call(drink.qtyByCup[cupId], source.lineId)
        ? drink.qtyByCup[cupId][source.lineId]
        : source.qty;
    return Math.max(0, Number(parseDecimalOrNull(qtyRaw) || 0));
  }

  function loadLibraryFamilyIntoDraft(familyKey) {
    const ids = getLibraryFamilyDrinkIdsByKey(familyKey);
    if (!ids.length) return;
    const variants = ids.map((id) => state.drinks.byId[id]).filter(Boolean);
    if (!variants.length) return;

    const cupSet = new Set();
    for (const d of variants) {
      const cupId = String(d?.container?.cupId || "");
      if (cupId && state.cups.byId[cupId]) cupSet.add(cupId);
      if (Array.isArray(d?.container?.cupIdsUsed)) {
        for (const cId of d.container.cupIdsUsed) {
          const safe = String(cId || "");
          if (safe && state.cups.byId[safe]) cupSet.add(safe);
        }
      }
      if (d?.qtyByCup && typeof d.qtyByCup === "object") {
        for (const cId of Object.keys(d.qtyByCup)) {
          const safe = String(cId || "");
          if (safe && state.cups.byId[safe]) cupSet.add(safe);
        }
      }
    }
    const cupIds = sortCupIdsForLibraryProfile(Array.from(cupSet));
    const baseRep = (cupIds.length ? pickFamilyRepresentativeForCup(variants, cupIds[0]) : null) || variants[0];
    if (!baseRep) return;

    const draft = deepClone(baseRep);
    if (!draft.container) draft.container = { cupId: null, cupIdsUsed: [] };
    draft.container.cupIdsUsed = cupIds.length ? cupIds.slice() : [String(draft?.container?.cupId || "")].filter(Boolean);
    draft.container.cupId = draft.container.cupIdsUsed[0] || null;
    if (draft.container.cupId) syncDraftSizeLabelFromCup(draft, draft.container.cupId);

    if (!Array.isArray(draft.items)) draft.items = [];
    draft.items = draft.items.map((it) => ({
      lineId: it?.lineId || uid("line"),
      ingredientId: it?.ingredientId ?? null,
      qty: Math.max(0, Number(it?.qty || 0)),
      includeUpcharge: !!it?.includeUpcharge,
      manualUpchargeMills: Math.max(0, Number(it?.manualUpchargeMills || 0)),
    }));

    const knownIngredientIds = new Set(draft.items.map((it) => String(it?.ingredientId || "")).filter(Boolean));
    for (const rep of variants) {
      for (const it of rep?.items || []) {
        const ingId = String(it?.ingredientId || "");
        if (!ingId) continue;
        if (knownIngredientIds.has(ingId)) continue;
        knownIngredientIds.add(ingId);
        draft.items.push({
          lineId: uid("line"),
          ingredientId: ingId,
          qty: 0,
          includeUpcharge: !!it?.includeUpcharge,
          manualUpchargeMills: Math.max(0, Number(it?.manualUpchargeMills || 0)),
        });
      }
    }

    draft.qtyByCup = {};
    for (const cupId of draft.container.cupIdsUsed) {
      const rep = pickFamilyRepresentativeForCup(variants, cupId) || baseRep;
      const map = {};
      for (const item of draft.items) {
        const qty = qtyForDrinkItemAtCup(rep, item, cupId);
        map[item.lineId] = String(qty);
        if (cupId === draft.container.cupId) item.qty = qty;
      }
      draft.qtyByCup[cupId] = map;
    }

    const familyMilkIds = Array.from(
      new Set(
        variants
          .map((d) => String(resolveMilkLibraryIdForDrink(d) || d?.milkId || ""))
          .filter((id) => id && state.milks.byId[id])
      )
    );
    const allMilkIds = getBuilderMilkEntries().map((m) => m.id);
    draft.milkIdsUsed = familyMilkIds.slice();
    draft.milkIdsExcluded = allMilkIds.filter((id) => !familyMilkIds.includes(id));
    draft.milkIdsUsedTouched = !!familyMilkIds.length;
    draft.modifierScenarioRows = getLibraryModifierScenarioRows(baseRep.id);
    draft.updatedAtIso = new Date().toISOString();

    state.ui.draftDrink = draft;
    setDraftBaselineFromCurrent(draft.id || "");
    syncBuilderUIFromDraft();
    persistAndRender();
  }

  function deleteLibraryFamilyByKey(familyKey) {
    const key = String(familyKey || "");
    if (!key) return;
    const ids = getLibraryFamilyDrinkIdsByKey(key);
    if (!ids.length) {
      if (state.ui.selectedLibraryFamilyKey === key) state.ui.selectedLibraryFamilyKey = "";
      renderLibrary();
      return;
    }

    const first = state.drinks.byId[ids[0]];
    const familyName = String(first?.name || "").trim() || "Unnamed";

    confirmDialog({
      title: `Delete "${familyName}"?`,
      body: `Delete "${familyName}" and all ${ids.length} variant(s) from your Library? This cannot be undone.`,
      okLabel: "Delete",
      danger: true,
      onOk: () => {
        const deleteSet = new Set(ids);
        for (const id of ids) {
          delete state.drinks.byId[id];
          if (state.ui.libraryModifierScenarioByDrink && typeof state.ui.libraryModifierScenarioByDrink === "object") {
            delete state.ui.libraryModifierScenarioByDrink[String(id)];
          }
        }
        state.drinks.order = state.drinks.order.filter((id) => state.drinks.byId[id]);

        if (deleteSet.has(state.ui.selectedLibraryDrinkId)) state.ui.selectedLibraryDrinkId = null;
        if (deleteSet.has(state.ui.draftDrink?.id)) state.ui.draftDrink.id = null;
        state.ui.librarySelectedDrinkIds = (state.ui.librarySelectedDrinkIds || []).filter((id) => !deleteSet.has(id));
        if (state.ui.selectedLibraryFamilyKey === key) state.ui.selectedLibraryFamilyKey = "";
        if (state.ui.libraryFamilyCollapsed && typeof state.ui.libraryFamilyCollapsed === "object") {
          delete state.ui.libraryFamilyCollapsed[key];
        }

        persistAndRender();
        toast(`Deleted "${familyName}" (${ids.length} variants).`);
      },
    });
  }

  // ---------- Rendering ----------
  function renderAll() {
    ensureDraftExists();
    applyThemeFromState();
    syncBuilderUIFromDraft();
    syncCcFeeUIFromState();
    setResultsTab("summary");
    renderBuilderAndResults();
    renderIngredients();
    renderMilks();
    renderModifiers();
    renderCups();
    renderAiCsvMatcher();
    renderLibrary();
    syncSettingsUIFromState();
  }

  function renderBuilderAndResults() {
    renderBuilderCupList();
    renderBuilderMilkList();
    renderBuilderTable();
    renderResults();
    updateSaveButtonLabel();
  }

  function isCupLikeIngredient(ing) {
    const category = String(ing.category || "").trim().toLowerCase();
    const name = String(ing.name || "").trim().toLowerCase();
    const looksLikeCup = category === "cup" || category.includes("cup") || name.includes("cup");
    return looksLikeCup && ing.unitKey === "each";
  }

  function isMilkIngredient(ing) {
    if (!ing) return false;
    const category = String(ing.category || "").trim().toLowerCase();
    const name = String(ing.name || "").trim().toLowerCase();
    if (category.includes("milk") || category.includes("dairy")) return true;
    if (/\bhalf\s*(&|and)\s*half\b/.test(name)) return true;
    if (/\bmilk\b/.test(name)) return true;
    return false;
  }

  function isMilkIngredientId(ingredientId) {
    if (!ingredientId) return false;
    const ing = state.ingredients.byId[ingredientId];
    if (ing && isMilkIngredient(ing)) return true;
    const inMilkLibrary = state.milks.order.some((id) => state.milks.byId[id]?.ingredientId === ingredientId);
    return inMilkLibrary;
  }

  function getMilkIngredientIdSet() {
    const set = new Set();
    for (const id of state.milks.order || []) {
      const ingId = state.milks.byId[id]?.ingredientId;
      if (ingId) set.add(ingId);
    }
    return set;
  }

  // Keep explicitly deleted milk ingredients from being auto-recreated on render.
  function getSuppressedMilkLibraryIngredientIds() {
    if (!state.ui) state.ui = {};
    if (!Array.isArray(state.ui.milkLibrarySuppressedIngredientIds)) state.ui.milkLibrarySuppressedIngredientIds = [];
    return state.ui.milkLibrarySuppressedIngredientIds;
  }

  function suppressMilkLibraryIngredientId(ingredientId) {
    const id = String(ingredientId || "");
    if (!id) return;
    const list = getSuppressedMilkLibraryIngredientIds();
    if (list.includes(id)) return;
    list.push(id);
    saveStateDebounced();
  }

  function unsuppressMilkLibraryIngredientId(ingredientId) {
    const id = String(ingredientId || "");
    if (!id) return;
    const list = getSuppressedMilkLibraryIngredientIds();
    if (!list.includes(id)) return;
    state.ui.milkLibrarySuppressedIngredientIds = list.filter((value) => value !== id);
    saveStateDebounced();
  }

  function isFlavorIngredient(ing) {
    if (!ing) return false;
    const category = String(ing.category || "").trim().toLowerCase();
    const name = String(ing.name || "").trim().toLowerCase();
    if (category.includes("syrup") || category.includes("sauce") || category.includes("flavor")) return true;
    if (/\bsyrup\b/.test(name) || /\bsauce\b/.test(name)) return true;
    return false;
  }

  function detectMilkIngredientIdFromItems(drink) {
    for (const it of drink?.items || []) {
      if (!it?.ingredientId) continue;
      if (!isMilkIngredientId(it.ingredientId)) continue;
      return it.ingredientId || "";
    }
    return "";
  }

  function resolveMilkLibraryIdForDrink(drink) {
    const fromItems = detectMilkIngredientIdFromItems(drink);
    if (fromItems) {
      const match = state.milks.order.find((id) => state.milks.byId[id]?.ingredientId === fromItems);
      if (match) return match;
    }
    const explicit = String(drink?.milkId || "");
    if (explicit && state.milks.byId[explicit]) return explicit;
    return "";
  }

  function isWholeMilkLibraryEntry(milk) {
    if (!milk || typeof milk !== "object") return false;
    const ing = milk.ingredientId ? state.ingredients.byId[milk.ingredientId] : null;
    const probe = [milk.name || "", ing?.name || "", ing?.category || ""].filter(Boolean).join(" ");
    return squareMilkKeyFromText(probe) === "whole";
  }

  function getMilkUpchargeMills(drink) {
    const milkId = resolveMilkLibraryIdForDrink(drink);
    if (!milkId) return 0;
    const milk = state.milks.byId[milkId];
    if (!milk) return 0;
    if (isWholeMilkLibraryEntry(milk)) return 0;
    const up = Number(milk.upchargeMills || 0);
    return up > 0 ? up : 0;
  }

  function detectMilkVariantName(drink) {
    const milkId = resolveMilkLibraryIdForDrink(drink);
    if (milkId && state.milks.byId[milkId]) {
      const name = String(state.milks.byId[milkId].name || "").trim();
      if (name) return name;
    }
    for (const it of drink?.items || []) {
      if (!it?.ingredientId) continue;
      const ing = state.ingredients.byId[it.ingredientId];
      if (!ing) continue;
      if (!isMilkIngredient(ing)) continue;
      return String(ing.name || "").trim() || "Milk";
    }
    return "";
  }

  function detectMilkIngredientId(drink) {
    const milkId = resolveMilkLibraryIdForDrink(drink);
    if (milkId) {
      const ingId = state.milks.byId[milkId]?.ingredientId;
      if (ingId) return ingId;
    }
    return detectMilkIngredientIdFromItems(drink);
  }

  function resolveMilkLineId(baseDrink, draftDrink, selectedMilkIds = []) {
    const selectedIngredientIds = (Array.isArray(selectedMilkIds) ? selectedMilkIds : [])
      .map((id) => state.milks.byId[id]?.ingredientId || id)
      .filter(Boolean);
    if (Array.isArray(baseDrink?.items) && selectedIngredientIds.length) {
      const match = baseDrink.items.find((it) => it?.ingredientId && selectedIngredientIds.includes(it.ingredientId));
      if (match?.lineId) return match.lineId;
    }
    const direct = detectMilkLineId(baseDrink);
    if (direct) return direct;
    const draftMilkId = detectMilkIngredientId(draftDrink);
    if (draftMilkId && Array.isArray(baseDrink?.items)) {
      const match = baseDrink.items.find((it) => it?.ingredientId === draftMilkId);
      if (match?.lineId) return match.lineId;
    }
    return "";
  }

  function detectFlavorVariantName(drink) {
    for (const it of drink?.items || []) {
      if (it?.lineId && String(it.lineId).startsWith("flavor_") && it.ingredientId) {
        const ing = state.ingredients.byId[it.ingredientId];
        if (ing) return String(ing.name || "").trim() || "Flavor";
      }
      if (!it?.ingredientId) continue;
      const ing = state.ingredients.byId[it.ingredientId];
      if (!ing) continue;
      if (!isFlavorIngredient(ing)) continue;
      return String(ing.name || "").trim() || "Flavor";
    }
    return "";
  }

  function detectFlavorIngredientId(drink) {
    for (const it of drink?.items || []) {
      if (it?.lineId && String(it.lineId).startsWith("flavor_") && it.ingredientId) {
        return it.ingredientId || "";
      }
      if (!it?.ingredientId) continue;
      const ing = state.ingredients.byId[it.ingredientId];
      if (!ing) continue;
      if (!isFlavorIngredient(ing)) continue;
      return it.ingredientId || "";
    }
    return "";
  }

  function detectTempLabel(drink) {
    const cupId = drink?.container?.cupId || null;
    const cup = cupId ? state.cups.byId[cupId] : null;
    const explicit = cupTempLabel(cup);
    if (explicit) return explicit;
    const cupText = cup ? `${cup.name || ""} ${cup.sizeLabel || ""}`.toLowerCase() : "";
    if (/\biced\b/.test(cupText)) return "Iced";
    if (/\bhot\b/.test(cupText)) return "Hot";
    const size = String(drink?.sizeLabel || "").trim().toLowerCase();
    if (/\biced\b/.test(size)) return "Iced";
    if (/\bhot\b/.test(size)) return "Hot";
    return "";
  }

  function detectSizeToken(drink) {
    const fromText = (t) => {
      const text = String(t || "");
      const mOz = text.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
      if (mOz) return `${mOz[1]}oz`;
      return "";
    };

    const cupId = drink?.container?.cupId || null;
    const cup = cupId ? state.cups.byId[cupId] : null;
    if (cup) {
      const fromCup = fromText(`${cup.sizeLabel || ""} ${cup.name || ""}`.trim());
      if (fromCup) return fromCup;
    }

    const sizeLabel = String(drink?.sizeLabel || "").trim();
    const fromSize = fromText(sizeLabel);
    if (fromSize) return fromSize;

    return "";
  }

  function drinkVariantTitle(d) {
    const temp = detectTempLabel(d);
    const milk = detectMilkVariantName(d);
    const flavor = detectFlavorVariantName(d);
    return [temp, milk, flavor].filter(Boolean).join(" • ");
  }

  function drinkVariantSummary(d) {
    const t = drinkVariantTitle(d);
    const size = String(d?.sizeLabel || "").trim();
    return [t, size].filter(Boolean).join(" • ");
  }

  function drinkVariantListTitle(d) {
    const size = detectSizeToken(d);
    const temp = detectTempLabel(d);
    const milk = detectMilkVariantName(d);
    const flavor = detectFlavorVariantName(d);
    const name = String(d?.name || "").trim();
    return [size, temp, milk, flavor, name].filter(Boolean).join(" ");
  }

  function stripDiacritics(text) {
    const s = String(text || "");
    try {
      return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch {
      return s;
    }
  }

  function normalizeSimpleLabel(text) {
    return stripDiacritics(text)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function simplifyMilkName(milkName) {
    const raw = normalizeSimpleLabel(milkName);
    if (!raw) return "";
    const parts = raw.split(/\s+/g).filter(Boolean);
    const idx = parts.lastIndexOf("milk");
    if (idx >= 1) return `${parts[idx - 1]} ${parts[idx]}`.trim();
    return raw;
  }

  function detectVariantFlavorNameOnly(drink) {
    for (const it of drink?.items || []) {
      if (it?.lineId && String(it.lineId).startsWith("flavor_") && it.ingredientId) {
        const ing = state.ingredients.byId[it.ingredientId];
        if (ing) return String(ing.name || "").trim() || "Flavor";
      }
    }
    return "";
  }

  function simplifyFlavorName(flavorName) {
    const raw = normalizeSimpleLabel(flavorName);
    if (!raw) return "";
    // remove common suffix words (keeps "salted caramel", etc.)
    const cleaned = raw
      .replace(/\b(syrup|sauce|powder|drizzle|puree|concentrate|base)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || raw;
  }

  function drinkVariantListTitleSimple(d) {
    const size = normalizeSimpleLabel(detectSizeToken(d));
    const temp = normalizeSimpleLabel(detectTempLabel(d));
    const milk = simplifyMilkName(detectMilkVariantName(d));
    const name = normalizeSimpleLabel(d?.name || "");
    return [size, temp, milk, name].filter(Boolean).join(" ");
  }

  function libraryListTitle(d) {
    const mode = getLibraryDescMode();
    if (mode === "simple") return drinkVariantListTitleSimple(d) || drinkVariantListTitle(d) || d?.name || "";
    return drinkVariantListTitle(d) || d?.name || "";
  }

  function familyKeyOf(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function detectDrinkTypeLabel(name) {
    const text = String(name || "").trim().toLowerCase();
    if (!text) return "Other";
    const checks = [
      ["Cold Brew", /\bcold\s*brew\b/],
      ["Cappuccino", /\bcappuccino\b/],
      ["Cortado", /\bcortado\b/],
      ["Flat White", /\bflat\s*white\b/],
      ["Macchiato", /\bmacchiato\b/],
      ["Americano", /\bamericano\b/],
      ["Mocha", /\bmocha\b/],
      ["Latte", /\blatte\b/],
      ["Chai", /\bchai\b/],
      ["Matcha", /\bmatcha\b/],
      ["Espresso", /\bespresso\b/],
      ["Tea", /\btea\b/],
      ["Drip Coffee", /\bdrip\b|\bfilter\b/],
    ];
    for (const [label, re] of checks) {
      if (re.test(text)) return label;
    }
    return "Other";
  }

  function getLibraryFamilyGroups() {
    const groups = [];
    const groupByKey = {};
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      const family = String(d?.name || "").trim() || "Unnamed";
      const key = familyKeyOf(family) || `__${id}`;
      if (!groupByKey[key]) {
        groupByKey[key] = { key, family, ids: [] };
        groups.push(groupByKey[key]);
      }
      groupByKey[key].ids.push(id);
    }
    groups.sort((a, b) => collator.compare(a.family, b.family));
    return groups;
  }

  function getVariantBaseFamilyKey() {
    return String(els.variantBaseDrink?.value || state.ui.variantBaseFamilyKey || "");
  }

  function getVariantBaseDrink() {
    const key = getVariantBaseFamilyKey();
    if (!key) return null;
    const groups = getLibraryFamilyGroups();
    const group = groups.find((g) => g.key === key);
    if (!group || !group.ids.length) return null;
    const noFlavorId = group.ids.find((id) => !detectFlavorIngredientId(state.drinks.byId[id]));
    const baseId = noFlavorId || group.ids[0];
    return state.drinks.byId[baseId] || null;
  }

  function renderVariantBaseSelect() {
    if (!els.variantBaseDrink) return;
    const groups = getLibraryFamilyGroups();
    if (!groups.length) {
      els.variantBaseDrink.innerHTML = `<option value="">No saved drinks</option>`;
      els.variantBaseDrink.disabled = true;
      state.ui.variantBaseFamilyKey = "";
      return;
    }
    let selectedKey = state.ui.variantBaseFamilyKey;
    if (!selectedKey || !groups.some((g) => g.key === selectedKey)) selectedKey = "";
    state.ui.variantBaseFamilyKey = selectedKey;
    els.variantBaseDrink.innerHTML = [
      `<option value="">Select base drink…</option>`,
      ...groups.map((g) => `<option value="${escapeAttr(g.key)}">${escapeHtml(g.family)}</option>`),
    ].join("");
    els.variantBaseDrink.disabled = false;
    els.variantBaseDrink.value = selectedKey;
  }

  function renderVariantBasePill(baseDrink) {
    if (!els.variantForDrink) return;
    if (!baseDrink) {
      els.variantForDrink.textContent = "Base: —";
      return;
    }
    const family = String(baseDrink?.name || "").trim() || "Unnamed";
    els.variantForDrink.textContent = `Base: ${family}`;
  }

  function getVariantUsedCupIds(baseDrink) {
    const fromBase = Array.isArray(baseDrink?.container?.cupIdsUsed)
      ? baseDrink.container.cupIdsUsed.filter((id) => !!state.cups.byId[id])
      : [];
    if (fromBase.length) return fromBase;
    const fallbackBaseCup = baseDrink?.container?.cupId;
    if (fallbackBaseCup && state.cups.byId[fallbackBaseCup]) return [fallbackBaseCup];
    return getDraftCupIdsUsed(state.ui.draftDrink).filter((id) => !!state.cups.byId[id]);
  }

  function renderVariantCupList(baseDrink) {
    const cups = state.cups.order.map((id) => state.cups.byId[id]).filter(Boolean);
    const usedCupIds = getVariantUsedCupIds(baseDrink);
    const hasUsedCups = usedCupIds.length > 0;
    if (!els.variantCupList) return;
    if (!cups.length) {
      els.variantCupList.innerHTML = `<div class="muted small">No cups found. Add cups in the <b>Cups</b> tab.</div>`;
      return;
    }
    els.variantCupList.innerHTML = cups
      .map((c) => {
        const cpu = cupCostPerEachMills(c);
        const sub = `${cupSizeLabelWithTemp(c) || "—"} • ${formatMoneyWithDigits(cpu, 4)} / each`;
        const checked = hasUsedCups ? usedCupIds.includes(c.id) : true;
        return `
          <label class="check-item">
            <input type="checkbox" data-var-cup-id="${escapeAttr(c.id)}" ${checked ? "checked" : ""} />
            <div>
              <b>${escapeHtml(c.name || "Cup")}</b>
              <div class="muted small">${escapeHtml(sub)}</div>
            </div>
          </label>
        `;
      })
      .join("");
  }

  function getSelectedVariantCupIds() {
    const fallback = getDraftCupIdsUsed(state.ui.draftDrink).filter((id) => !!state.cups.byId[id]);
    if (!els.variantCupList) return fallback;
    const checkboxes = Array.from(els.variantCupList.querySelectorAll('input[type="checkbox"][data-var-cup-id]'));
    if (!checkboxes.length) return fallback;
    const checked = getCheckedVariantIds(els.variantCupList, "data-var-cup-id").filter((id) => !!state.cups.byId[id]);
    return checked;
  }

  function normalizeKeyPart(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function variantKeyForDrink(drink) {
    const nameKey = familyKeyOf(drink?.name || "");
    const cupId = String(drink?.container?.cupId || "");
    const milkKey = resolveMilkLibraryIdForDrink(drink) || detectMilkIngredientIdFromItems(drink);
    const flavorId = detectFlavorIngredientId(drink);
    const sizeKey = normalizeKeyPart(drink?.sizeLabel || "");
    return [nameKey, cupId, milkKey, flavorId, sizeKey].join("|");
  }

  function buildVariantKeyIndex() {
    const map = new Map();
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      const key = variantKeyForDrink(d);
      if (!key) continue;
      if (!map.has(key)) map.set(key, id);
    }
    return map;
  }

  function autoGeneratePlainMilkVariants(baseDrink, draftDrink) {
    const milks = state.milks.order
      .map((id) => state.milks.byId[id])
      .filter(Boolean)
      .filter((m) => m.ingredientId && state.ingredients.byId[m.ingredientId])
      .filter((m) => !state.ingredients.byId[m.ingredientId].archived);
    if (!milks.length) return { created: 0, skipped: 0, reason: "no_milk" };
    const milkIds = milks.map((m) => m.id).filter(Boolean);

    let cupIds = getDraftCupIdsUsed(draftDrink).filter((id) => !!state.cups.byId[id]);
    if (!cupIds.length) {
      const fallback = baseDrink?.container?.cupId;
      if (fallback && state.cups.byId[fallback]) cupIds = [fallback];
    }
    if (!cupIds.length) return { created: 0, skipped: 0, reason: "no_cup" };

    const milkLineId = resolveMilkLineId(baseDrink, draftDrink, milkIds);
    if (!milkLineId) return { created: 0, skipped: 0, reason: "no_line" };

    const keyIndex = buildVariantKeyIndex();
    const newKeys = new Set();
    let created = 0;
    let skipped = 0;

    for (const cupId of cupIds) {
      const cup = state.cups.byId[cupId] || null;
      for (const milk of milks) {
        const copy = deepClone(baseDrink);
        copy.id = uid("drink");
        copy.updatedAtIso = new Date().toISOString();
        if (!copy.container) copy.container = { cupId: null, cupIdsUsed: [] };
        copy.container.cupId = cupId || null;
        copy.container.cupIdsUsed = cupId ? [cupId] : [];
        copy.milkId = milk.id;

        if (cup) {
          const label = String(cup.sizeLabel || "").trim() || String(cup.name || "").trim();
          if (label) copy.sizeLabel = label;
        }

        if (!Array.isArray(copy.items)) copy.items = [];
        copy.items = copy.items.filter((it) => {
          const ing = it?.ingredientId ? state.ingredients.byId[it.ingredientId] : null;
          return !(ing && isFlavorIngredient(ing));
        });

        let milkLine = copy.items.find((it) => it.lineId === milkLineId);
        if (!milkLine) {
          milkLine = copy.items.find((it) => {
            const ing = it?.ingredientId ? state.ingredients.byId[it.ingredientId] : null;
            return !!ing && isMilkIngredient(ing);
          });
        }
        if (milkLine) milkLine.ingredientId = milk.ingredientId;

        const key = variantKeyForDrink(copy);
        if (key && (keyIndex.has(key) || newKeys.has(key))) {
          skipped += 1;
          continue;
        }
        if (key) newKeys.add(key);

        state.drinks.byId[copy.id] = copy;
        state.drinks.order.unshift(copy.id);
        created += 1;
      }
    }

    return { created, skipped, reason: null };
  }

  function getBuilderCupEntries() {
    return state.cups.order.map((id) => state.cups.byId[id]).filter(Boolean);
  }

  function renderBuilderCupList() {
    if (!els.builderCupList) return;
    const draft = state.ui.draftDrink;
    const cups = getBuilderCupEntries();
    if (!cups.length) {
      els.builderCupList.innerHTML = `<div class="muted small">No cups found. Add them in the <b>Cup Library</b>.</div>`;
      return;
    }
    const selectedSet = new Set(getDraftCupIdsUsed(draft));
    const activeId = String(draft?.container?.cupId || "");
    els.builderCupList.innerHTML = cups
      .map((c) => {
        const cpu = cupCostPerEachMills(c);
        const sizeLabel = cupSizeLabelWithTemp(c);
        const name = String(c.name || "").trim();
        const title = sizeLabel && name ? `${sizeLabel} ${name}`.trim() : sizeLabel || name || "Cup";
        const sub = `${sizeLabel || name || "Cup"} • ${formatMoneyWithDigits(cpu, 4)} / each`;
        const checked = selectedSet.has(c.id);
        const activeClass = checked && c.id === activeId ? " is-active" : "";
        return `
          <label class="check-item${activeClass}">
            <input type="checkbox" data-builder-cup-id="${escapeAttr(c.id)}" ${checked ? "checked" : ""} />
            <div>
              <b>${escapeHtml(title)}</b>
              <div class="muted small">${escapeHtml(sub)}</div>
            </div>
          </label>
        `;
      })
      .join("");
  }

  function setAllBuilderCupChecks(checked) {
    if (!els.builderCupList) return;
    els.builderCupList.querySelectorAll('input[type="checkbox"][data-builder-cup-id]').forEach((cb) => {
      cb.checked = !!checked;
    });
    updateBuilderCupSelectionFromUI();
  }

  function updateBuilderCupSelectionFromUI(changedId = "") {
    if (!els.builderCupList) return;
    const draft = state.ui.draftDrink;
    if (!draft.container) draft.container = { cupId: null, cupIdsUsed: [] };
    const checkedIds = Array.from(
      els.builderCupList.querySelectorAll('input[type="checkbox"][data-builder-cup-id]:checked')
    )
      .map((el) => el.getAttribute("data-builder-cup-id"))
      .filter(Boolean);
    draft.container.cupIdsUsed = checkedIds;
    if (changedId && checkedIds.includes(changedId)) {
      draft.container.cupId = changedId;
    } else if (!checkedIds.includes(draft.container.cupId)) {
      draft.container.cupId = checkedIds[0] || null;
    }
    if (draft.container.cupId) syncDraftSizeLabelFromCup(draft, draft.container.cupId);
    applyActiveCupQtyToItems(draft);
    saveStateDebounced();
    renderBuilderAndResults();
  }

  function getDraftCupIdsUsed(draft) {
    const ids = Array.isArray(draft?.container?.cupIdsUsed) ? draft.container.cupIdsUsed : [];
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const id = String(raw || "");
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    const active = String(draft?.container?.cupId || "");
    if (active && !seen.has(active)) out.unshift(active);
    return out;
  }

  function renderCupsUsedChips() {
    if (!els.cupUsedChips) return;
    const draft = state.ui.draftDrink;
    const ids = getDraftCupIdsUsed(draft);
    if (!ids.length) {
      els.cupUsedChips.innerHTML = "";
      return;
    }

    const activeId = String(draft?.container?.cupId || "");
    els.cupUsedChips.innerHTML = ids
      .map((id) => {
        const cup = state.cups.byId[id];
        const label = cup
          ? `${cupSizeLabelWithTemp(cup)} ${String(cup.name || "").trim()}`.trim() || "Cup"
          : "[Missing cup]";
        const activeClass = id === activeId ? "is-active" : "";
        return `<span class="variant-chip ${activeClass}" data-cup-used-id="${escapeAttr(id)}">${escapeHtml(
          label
        )}<button type="button" class="chip-x" data-remove-cup-used-id="${escapeAttr(
          id
        )}" aria-label="Remove cup">✕</button></span>`;
      })
      .join("");
  }

  function getBuilderMilkEntries() {
    ensureMilkLibraryCoversIngredients();
    return state.milks.order
      .map((id) => state.milks.byId[id])
      .filter(Boolean)
      .filter((m) => m.ingredientId && state.ingredients.byId[m.ingredientId]);
  }

  function ensureMilkLibraryCoversIngredients() {
    if (!state.milks || !state.milks.byId || !Array.isArray(state.milks.order)) return;
    const suppressed = new Set(getSuppressedMilkLibraryIngredientIds());
    const existingByIngredient = new Set();
    for (const id of state.milks.order) {
      const m = state.milks.byId[id];
      if (m?.ingredientId) existingByIngredient.add(m.ingredientId);
    }
    let added = false;
    for (const ingId of state.ingredients.order || []) {
      const ing = state.ingredients.byId[ingId];
      if (!ing) continue;
      if (!isMilkIngredient(ing)) continue;
      if (suppressed.has(ing.id)) continue;
      if (existingByIngredient.has(ing.id)) continue;
      const id = state.milks.byId[`milk_from_${ing.id}`] ? uid("milk") : `milk_from_${ing.id}`;
      state.milks.byId[id] = {
        id,
        name: ing.name || "Milk",
        ingredientId: ing.id,
        category: "",
        upchargeMills: 0,
        notes: "",
        updatedAtIso: ing.updatedAtIso || new Date().toISOString(),
      };
      state.milks.order.unshift(id);
      existingByIngredient.add(ing.id);
      added = true;
    }
    if (added) saveStateDebounced();
  }

  function getDraftMilkIdsUsed(draft) {
    const all = getBuilderMilkEntries().map((m) => m.id);
    if (Array.isArray(draft?.milkIdsExcluded)) {
      const excluded = new Set(draft.milkIdsExcluded.map((x) => String(x || "")).filter(Boolean));
      return all.filter((id) => !excluded.has(id));
    }
    const ids = Array.isArray(draft?.milkIdsUsed) ? draft.milkIdsUsed : [];
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const id = String(raw || "");
      if (!id) continue;
      if (seen.has(id)) continue;
      if (!state.milks.byId[id]) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function renderBuilderMilkList() {
    if (!els.builderMilkList) return;
    const draft = state.ui.draftDrink;
    const milks = getBuilderMilkEntries();
    if (!milks.length) {
      els.builderMilkList.innerHTML = `<div class="muted small">No milks found. Add them in the <b>Milk Library</b>.</div>`;
      return;
    }
    if (!Array.isArray(draft.milkIdsExcluded)) draft.milkIdsExcluded = [];
    const selectedSet = new Set(getDraftMilkIdsUsed(draft));
    els.builderMilkList.innerHTML = milks
      .map((m) => {
        const ing = m.ingredientId ? state.ingredients.byId[m.ingredientId] : null;
        const upcharge = Number(m.upchargeMills || 0);
        const subParts = [];
        subParts.push(ing ? ing.name || "Ingredient" : "Missing ingredient");
        subParts.push(upcharge > 0 ? `Upcharge ${formatMoney(upcharge)}` : "No upcharge");
        const sub = subParts.join(" • ");
        const checked = selectedSet.has(m.id);
        return `
          <label class="check-item">
            <input type="checkbox" data-builder-milk-id="${escapeAttr(m.id)}" ${checked ? "checked" : ""} />
            <div>
              <b>${escapeHtml(m.name || "Milk")}</b>
              <div class="muted small">${escapeHtml(sub)}</div>
            </div>
          </label>
        `;
      })
      .join("");
  }

  function setAllBuilderMilkChecks(checked) {
    if (!els.builderMilkList) return;
    els.builderMilkList.querySelectorAll('input[type="checkbox"][data-builder-milk-id]').forEach((cb) => {
      cb.checked = !!checked;
    });
    updateBuilderMilkSelectionFromUI(true);
  }

  function updateBuilderMilkSelectionFromUI(touched = true) {
    if (!els.builderMilkList) return;
    const draft = state.ui.draftDrink;
    const checkedIds = new Set(
      Array.from(els.builderMilkList.querySelectorAll('input[type="checkbox"][data-builder-milk-id]:checked'))
        .map((el) => el.getAttribute("data-builder-milk-id"))
        .filter(Boolean)
    );
    const allIds = getBuilderMilkEntries().map((m) => m.id);
    draft.milkIdsExcluded = allIds.filter((id) => !checkedIds.has(id));
    if (touched) draft.milkIdsUsedTouched = true;
    saveStateDebounced();
  }

  function ensureDraftQtyByCup(draft) {
    if (!draft.qtyByCup || typeof draft.qtyByCup !== "object") draft.qtyByCup = {};
  }

  function getDraftCupQtyValue(draft, cupId, lineId, fallbackQty) {
    if (!cupId || !lineId) return fallbackQty == null ? "" : String(fallbackQty);
    ensureDraftQtyByCup(draft);
    const map = draft.qtyByCup[cupId];
    if (map && map[lineId] != null && map[lineId] !== "") return String(map[lineId]);
    if (fallbackQty == null) return "";
    return String(fallbackQty);
  }

  function applyActiveCupQtyToItems(draft) {
    if (!draft) return;
    const cupId = draft?.container?.cupId || "";
    if (!cupId) return;
    ensureDraftQtyByCup(draft);
    const map = draft.qtyByCup[cupId];
    if (!map) return;
    for (const it of draft.items || []) {
      if (!it?.lineId) continue;
      const raw = map[it.lineId];
      const n = parseDecimalOrNull(raw);
      if (typeof n === "number") it.qty = n;
    }
  }

  function syncDraftSizeLabelFromCup(draft, cupIdRaw) {
    if (!draft) return;
    const cupId = String(cupIdRaw || "");
    if (!cupId) return;
    const cup = state.cups.byId[cupId];
    if (!cup) return;
    const label = String(cup.sizeLabel || "").trim() || String(cup.name || "").trim();
    if (label) draft.sizeLabel = label;
  }

  function setDraftActiveCup(cupIdRaw) {
    const cupId = String(cupIdRaw || "");
    if (!cupId) return;
    const draft = state.ui.draftDrink;
    if (!draft.container) draft.container = { cupId: null, cupIdsUsed: [] };
    if (!Array.isArray(draft.container.cupIdsUsed)) draft.container.cupIdsUsed = [];
    if (!draft.container.cupIdsUsed.includes(cupId)) draft.container.cupIdsUsed.push(cupId);
    draft.container.cupId = cupId;
    syncDraftSizeLabelFromCup(draft, cupId);
    applyActiveCupQtyToItems(draft);
    saveStateDebounced();
    renderBuilderAndResults();
  }

  function removeDraftCupUsed(cupIdRaw) {
    const cupId = String(cupIdRaw || "");
    if (!cupId) return;
    const draft = state.ui.draftDrink;
    if (!draft.container) draft.container = { cupId: null, cupIdsUsed: [] };
    if (!Array.isArray(draft.container.cupIdsUsed)) draft.container.cupIdsUsed = [];
    draft.container.cupIdsUsed = draft.container.cupIdsUsed.filter((id) => id !== cupId);
    if (draft.container.cupId === cupId) {
      draft.container.cupId = draft.container.cupIdsUsed[0] || null;
      applyActiveCupQtyToItems(draft);
      if (draft.container.cupId) syncDraftSizeLabelFromCup(draft, draft.container.cupId);
    }
    saveStateDebounced();
    renderBuilderAndResults();
  }

  function renderBuilderTable() {
    const draft = state.ui.draftDrink;
    const allIngredients = state.ingredients.order
      .map((id) => state.ingredients.byId[id])
      .filter(Boolean);
    const milkEntries = state.milks.order
      .map((id) => state.milks.byId[id])
      .filter(Boolean)
      .filter((m) => m.ingredientId && state.ingredients.byId[m.ingredientId]);
    const milkIngredientIds = getMilkIngredientIdSet();
    const ingredientList = allIngredients.filter((ing) => !milkIngredientIds.has(ing.id));
    const cupIdsUsed = getDraftCupIdsUsed(draft).filter((id) => !!state.cups.byId[id]);
    const showCupColumns = cupIdsUsed.length > 1;
    const activeCupId = draft?.container?.cupId || cupIdsUsed[0] || "";
    const cupCols = showCupColumns
      ? cupIdsUsed
          .map((id) => state.cups.byId[id])
          .filter(Boolean)
          .map((c) => {
            const label = cupSizeLabelWithTemp(c) || String(c.name || "").trim() || "Cup";
            return { id: c.id, label };
          })
      : [];

    if (!draft.items.length) {
      els.builderTableWrap.innerHTML = `
        <div class="muted small">
          No ingredient lines yet. Click <b>Add line</b> to start building your recipe.
        </div>
      `;
      return;
    }

	    const rows = draft.items
	      .map((it) => {
	        const selected = it.ingredientId ? state.ingredients.byId[it.ingredientId] : null;
	        const isMissing = !!it.ingredientId && !selected;
        const milkOptions = milkEntries
          .filter((m) => {
            const ing = state.ingredients.byId[m.ingredientId];
            if (!ing) return false;
            return !ing.archived || ing.id === it.ingredientId;
          })
          .map((m) => {
            const ing = state.ingredients.byId[m.ingredientId];
            const label = `${escapeHtml(m.name || ing?.name || "Milk")}${ing?.archived ? " (archived)" : ""}`;
            return `<option value="${m.ingredientId}" ${m.ingredientId === it.ingredientId ? "selected" : ""}>${label}</option>`;
          })
          .join("");

        const ingredientOptions = ingredientList
          .filter((ing) => (!ing.archived || ing.id === it.ingredientId) && (!isCupLikeIngredient(ing) || ing.id === it.ingredientId))
          .map((ing) => {
            const label = `${escapeHtml(ing.name)}${ing.archived ? " (archived)" : ""}`;
            return `<option value="${ing.id}" ${ing.id === it.ingredientId ? "selected" : ""}>${label}</option>`;
          })
          .join("");

        const options = [
          milkOptions ? `<optgroup label="Milks">${milkOptions}</optgroup>` : "",
          ingredientOptions ? `<optgroup label="Ingredients">${ingredientOptions}</optgroup>` : "",
        ].join("");

	        const missingOption = isMissing
	          ? `<option value="${escapeAttr(it.ingredientId)}" selected>[Missing ingredient]</option>`
	          : "";

	        const unit = selected ? unitLabel(selected) : isMissing ? "—" : "—";
	        const cpu = selected ? ingredientCostPerUnitMills(selected) : 0;
	        const upchargeMills = selected ? Number(selected.upchargeMills || 0) : 0;
	        const hasUpcharge = upchargeMills > 0;
        const milkEntryForLine = selected
          ? milkEntries.find((m) => m.ingredientId === selected.id) || null
          : null;
        const wholeMilkLineUpchargeMills =
          milkEntryForLine && isWholeMilkLibraryEntry(milkEntryForLine)
            ? Math.max(0, Number(milkEntryForLine.upchargeMills || 0))
            : 0;
        const canApplyUpcharge = hasUpcharge || wholeMilkLineUpchargeMills > 0;
	        const upchargeChecked = !!it.includeUpcharge && canApplyUpcharge;
        const upchargeTitle = hasUpcharge
          ? "Apply this ingredient's upcharge to the selling price"
          : wholeMilkLineUpchargeMills > 0
          ? "Apply whole milk upcharge to this drink"
          : "No upcharge configured for this ingredient";
	        const activeQtyRaw = showCupColumns && activeCupId ? getDraftCupQtyValue(draft, activeCupId, it.lineId, it.qty) : it.qty;
	        const activeQty = Math.max(0, Number(parseDecimalOrNull(activeQtyRaw) || 0));
	        const lineCost = selected ? Math.round(activeQty * cpu) : 0;
        const qtyCells = showCupColumns
          ? cupCols
              .map((c) => {
                const val = getDraftCupQtyValue(draft, c.id, it.lineId, it.qty);
                const activeClass = c.id === activeCupId ? " is-active-col" : "";
                return `
                  <td class="right${activeClass}">
                    <input class="js-line-qty-cup" data-line-id="${it.lineId}" data-cup-id="${escapeAttr(
                      c.id
                    )}" inputmode="decimal" value="${escapeAttr(val)}" />
                  </td>
                `;
              })
              .join("")
          : "";

        const qtyCell = showCupColumns
          ? qtyCells
          : `
              <td class="right">
                <input class="js-line-qty" data-line-id="${it.lineId}" inputmode="decimal" value="${escapeAttr(
                  it.qty ?? 0
                )}" />
              </td>
            `;
        const unitCell = `<td class="mono">${escapeHtml(unit)}</td>`;
        const midCells = showCupColumns ? `${unitCell}${qtyCell}` : `${qtyCell}${unitCell}`;

	        return `
	          <tr>
	            <td>
	              <select class="js-line-ingredient" data-line-id="${it.lineId}">
	                <option value="" ${it.ingredientId ? "" : "selected"}>Select ingredient…</option>
	                ${missingOption}
	                ${options}
	              </select>
	            </td>
	            <td class="right upcharge-cell">
	              <input class="js-line-upcharge upcharge-toggle" data-line-id="${it.lineId}" type="checkbox" title="${escapeAttr(upchargeTitle)}" ${
	                upchargeChecked ? "checked" : ""
	              } ${canApplyUpcharge ? "" : "disabled"} />
	            </td>
	            ${midCells}
	            <td class="right mono">${selected ? `${formatMoneyWithDigits(cpu, 4)} / ${escapeHtml(unit)}` : "—"}</td>
	            <td class="right"><span class="mono" data-line-cost="${it.lineId}">${selected ? formatMoney(lineCost) : "—"}</span></td>
	            <td class="right">
	              <button class="btn danger js-line-remove" data-line-id="${it.lineId}" type="button">Remove</button>
	            </td>
	          </tr>
	        `;
	      })
	      .join("");

	    const header = showCupColumns
	      ? `
	        <tr>
	          <th>Ingredient</th>
	          <th class="right">Upcharge</th>
	          <th>Unit</th>
	          ${cupCols
	            .map((c) => {
	              const activeClass = c.id === activeCupId ? " class=\"right is-active-col\"" : " class=\"right\"";
              return `<th${activeClass}>${escapeHtml(c.label)}</th>`;
            })
            .join("")}
          <th class="right">Unit cost</th>
          <th class="right">Line cost</th>
          <th class="right">Actions</th>
        </tr>
	      `
	      : `
	        <tr>
	          <th>Ingredient</th>
	          <th class="right">Upcharge</th>
	          <th class="right">Qty</th>
	          <th>Unit</th>
	          <th class="right">Unit cost</th>
	          <th class="right">Line cost</th>
          <th class="right">Actions</th>
        </tr>
      `;

    els.builderTableWrap.innerHTML = `
      <table>
        <thead>
          ${header}
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

	  function renderResults() {
	    const draft = state.ui.draftDrink;
	    const computed = computeDrink(draft);
	    const taxMode = computed?.taxMode === "inclusive" ? "inclusive" : "additive";

	    els.pillDraft.textContent = draft.id ? "Saved" : "Draft";

	    els.kpiTotalCost.textContent = formatMoney(computed.totalCostMills);
	    if (els.lblSellPrice) {
	      els.lblSellPrice.textContent = taxMode === "inclusive" ? "Selling price (tax included)" : "Selling price";
	    }
	    els.tileConsumerPrice?.classList.toggle("hidden", taxMode === "inclusive");
	    els.kpiSellPrice.textContent =
	      taxMode === "inclusive" ? formatMoney(computed.consumerPriceMills) : formatMoney(computed.sellPriceMills);
	    els.kpiConsumerPrice.textContent = formatMoney(computed.consumerPriceMills);
	    els.kpiProfit.textContent = formatMoney(computed.profitMills);
	    els.kpiProfitCard.textContent = formatMoney(computed.profitCardMills);

    if (!draft.items.length && !(computed.modifierCostMills > 0)) {
      els.kpiCostHint.textContent = "Add ingredients to see costs.";
    } else {
      const missing = computed.missingCount ? ` • Missing ingredients: ${computed.missingCount}` : "";
      const modifierPart = computed.modifierCostMills > 0 ? ` • ${formatMoney(computed.modifierCostMills)} modifiers` : "";
      els.kpiCostHint.textContent = `${formatMoney(computed.itemsCostMills)} ingredients${modifierPart}${missing}`;
    }
	    const target = draft?.pricing?.targetMarginPct;
		    const salesTaxLabel = trimZeros(Number(draft?.extra?.salesTaxPct || 0));
		    if (computed.baseSellPriceMills > 0) {
		      const parts = [];
		      if (computed.milkUpchargeMills > 0) parts.push(`milk upcharge ${formatMoney(computed.milkUpchargeMills)}`);
		      if (computed.ingredientUpchargeMills > 0) parts.push(`ingredient upcharges ${formatMoney(computed.ingredientUpchargeMills)}`);
          if (computed.modifierUpchargeMills > 0) parts.push(`library modifiers ${formatMoney(computed.modifierUpchargeMills)}`);
		      const baseHint = parts.length
		        ? `Base ${formatMoney(computed.baseSellPriceMills)} + ${parts.join(" + ")}`
		        : "—";
		      if (taxMode === "inclusive" && computed.consumerTaxMills > 0) {
		        const taxHint = `Includes ${salesTaxLabel}% = ${formatMoney(computed.consumerTaxMills)}`;
		        els.kpiPriceHint.textContent = baseHint === "—" ? taxHint : `${baseHint} • ${taxHint}`;
		      } else {
		        els.kpiPriceHint.textContent = baseHint;
		      }
			    } else if (target && computed.totalCostMills > 0) {
			      const suggested = priceForMarginMills(computed.totalCostMills, target, {
			        taxMode: state?.settings?.taxMode,
			        salesTaxPct: draft?.extra?.salesTaxPct,
			      });
			      const suffix = taxMode === "inclusive" ? " (tax included)" : "";
			      els.kpiPriceHint.textContent = `Suggested for ${target}% margin: ${formatMoney(suggested)}${suffix}`;
			    } else {
		      els.kpiPriceHint.textContent = "Enter a selling price.";
		    }

				    if (taxMode === "inclusive") {
				      els.kpiConsumerHint.textContent = "—";
				    } else if (computed.sellPriceMills > 0 && computed.consumerTaxMills > 0) {
				      els.kpiConsumerHint.textContent = `${salesTaxLabel}% = ${formatMoney(computed.consumerTaxMills)}`;
				    } else if (computed.sellPriceMills > 0) {
				      els.kpiConsumerHint.textContent = "—";
				    } else {
				      els.kpiConsumerHint.textContent = "Enter a selling price and sales tax.";
				    }

    if (computed.sellPriceMills > 0) {
      els.kpiProfitHint.textContent = computed.profitMills >= 0 ? "—" : "Below cost.";
      els.kpiProfitCardHint.textContent = computed.ccFeeMills > 0 ? `Fee: ${formatMoney(computed.ccFeeMills)}` : "After credit card fee.";
    } else {
      els.kpiProfitHint.textContent = "—";
      els.kpiProfitCardHint.textContent = "Enter a selling price.";
    }

    if (computed.sellPriceMills > 0) {
      els.kpiMargin.textContent = `${computed.marginPct.toFixed(1)}%`;
      if (target) {
        els.kpiMarginHint.textContent = `Target ${target}%`;
      } else {
        els.kpiMarginHint.textContent = computed.marginPct >= 0 ? "—" : "Negative margin.";
      }
    } else {
      els.kpiMargin.textContent = "—";
      els.kpiMarginHint.textContent = "Enter a selling price.";
    }

    if (computed.sellPriceMills > 0) {
      els.kpiMarginCard.textContent = `${computed.marginCardPct.toFixed(1)}%`;
      els.kpiMarginCardHint.textContent = "—";
    } else {
      els.kpiMarginCard.textContent = "—";
      els.kpiMarginCardHint.textContent = "Enter a selling price.";
    }

    // Credit card fee results (based on consumer price with tax)
    els.kpiCcFee.textContent = formatMoney(computed.ccFeeMills);
    els.kpiProfitCc.textContent = formatMoney(computed.profitCardMills);
    if (computed.sellPriceMills > 0) {
      els.kpiMarginCc.textContent = `${computed.marginCardPct.toFixed(1)}%`;
      els.kpiMarginCcHint.textContent = "—";
    } else {
      els.kpiMarginCc.textContent = "—";
      els.kpiMarginCcHint.textContent = "Enter a selling price.";
    }

    renderBreakdownTable(computed);
  }

  function setResultsTab(tab) {
    const isSummary = tab === "summary";
    els.tabResultsSummary.classList.toggle("is-active", isSummary);
    els.tabResultsCC.classList.toggle("is-active", !isSummary);
    els.resultsSummary.classList.toggle("hidden", !isSummary);
    els.resultsCC.classList.toggle("hidden", isSummary);
  }

  function syncCcFeeUIFromState() {
    els.ccFeePct.value = state.settings.ccFeePct == null ? "" : String(state.settings.ccFeePct);
    els.ccFeeFixed.value = millsToMoneyInput(state.settings.ccFeeFixedMills || 0);
  }

  function syncCcFeeFromUI() {
    const pct = parseDecimalOrNull(els.ccFeePct.value);
    state.settings.ccFeePct = pct == null ? 0 : clamp(pct, 0, 20);
    state.settings.ccFeeFixedMills = clamp(parseMoneyToMills(els.ccFeeFixed.value), 0, Number.MAX_SAFE_INTEGER);
  }

  function renderBreakdownTable(computed) {
    if (!computed.lines.length) {
      els.breakdownWrap.innerHTML = `<div class="muted small">No breakdown yet.</div>`;
      return;
    }

    const rows = computed.lines
      .map((l) => {
        const qtyStr = l.isUpcharge ? "—" : `${trimZeros(l.qty)} ${escapeHtml(l.unit)}`;
        const costStr = l.isUpcharge ? `+${formatMoney(l.costMills)}` : formatMoney(l.costMills);
        const missingHint = l.missing ? `<div class="muted small">Missing ingredient</div>` : "";
        return `
          <tr>
            <td><b>${escapeHtml(l.name)}</b><div class="muted small">${escapeHtml(l.category || "")}</div></td>
            <td class="right mono">${qtyStr}</td>
            <td class="right mono">${costStr}${missingHint}</td>
          </tr>
        `;
      })
      .join("");

    els.breakdownWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th class="right">Qty</th>
            <th class="right">Cost</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <td><b>Total</b></td>
            <td class="right mono">—</td>
            <td class="right mono"><b>${formatMoney(computed.totalCostMills)}</b></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function renderIngredients() {
    els.ingredientSearch.value = state.ui.ingredientSearch || "";
    const q = (state.ui.ingredientSearch || "").trim().toLowerCase();
    const milkIngredientIds = getMilkIngredientIdSet();

    const rows = state.ingredients.order
      .map((id) => state.ingredients.byId[id])
      .filter(Boolean)
      .filter((ing) => !isCupLikeIngredient(ing))
      .filter((ing) => !milkIngredientIds.has(ing.id))
      .filter((ing) => {
        if (!q) return true;
        return (
          (ing.name || "").toLowerCase().includes(q) ||
          (ing.category || "").toLowerCase().includes(q)
        );
      })
	      .map((ing) => {
	        const cpu = ingredientCostPerUnitMills(ing);
	        const usedBy = ingredientUsedByCount(ing.id);
	        const unit = unitLabel(ing);
	        const upchargeMills = Math.max(0, Number(ing.upchargeMills || 0));
	        const upchargeHint = upchargeMills > 0 ? ` • Upcharge ${formatMoney(upchargeMills)}` : "";
	        const purchaseUnit = purchaseUnitLabel(
	          ing.purchaseAmountUnitKey || (ing.unitKey === "custom" ? "each" : ing.unitKey)
	        );
	        const purchasePriceMills =
	          ing.unitKey === "coffee_pricing" ? Number(ing.coffeePricePerLbMills || 0) : Number(ing.purchasePriceMills || 0);
        return `
          <tr>
	            <td>
	              <b>${escapeHtml(ing.name)}</b>
	              <div class="muted small">${escapeHtml(ing.category || "—")}${upchargeHint}</div>
	            </td>
            <td class="mono">${escapeHtml(unit)}</td>
            <td class="right mono">${formatMoney(purchasePriceMills)}${ing.unitKey === "coffee_pricing" ? " / lb" : ""}</td>
            <td class="right mono">${ing.unitKey === "coffee_pricing" ? "—" : `${trimZeros(ing.purchaseAmount)} ${escapeHtml(purchaseUnit)}`}</td>
            <td class="right mono">${formatMoneyWithDigits(cpu, 4)} / ${escapeHtml(unit)}</td>
            <td class="right mono">${usedBy}</td>
            <td class="right mono">${ing.archived ? "Archived" : "Active"}</td>
            <td class="right">
              <button class="btn" data-action="edit" data-ingredient-id="${ing.id}" type="button">Edit</button>
              <button class="btn danger" data-action="delete" data-ingredient-id="${ing.id}" type="button">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");

    els.ingredientTableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Reporting Cost Unit</th>
            <th class="right">Purchase price</th>
            <th class="right">Purchase amount</th>
            <th class="right">Unit cost</th>
            <th class="right">Used by</th>
            <th class="right">Status</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            `<tr><td colspan="8" class="muted small">No non-milk ingredients yet. Click <b>New ingredient</b> to add one. Milks live in the <b>Milk Library</b>.</td></tr>`
          }
        </tbody>
      </table>
    `;
  }

  function renderLibrary() {
    const rawQuery = String(state.ui.librarySearch || "");
    els.librarySearch.value = rawQuery;
    const qTokens = normalizeSimpleLabel(rawQuery).split(/[\s]+/g).filter(Boolean);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const familyCategoryMap = {};
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      const familyKey = libraryFamilyKeyForDrinkId(id);
      if (!familyCategoryMap[familyKey]) familyCategoryMap[familyKey] = new Set();
      const cat = String(d.category || "").trim();
      if (cat) familyCategoryMap[familyKey].add(cat);
    }
    if (!Array.isArray(state.ui.librarySelectedDrinkIds)) state.ui.librarySelectedDrinkIds = [];
    state.ui.librarySelectedDrinkIds = state.ui.librarySelectedDrinkIds.filter((id) => state.drinks.byId[id]);
    const selectedSet = new Set(state.ui.librarySelectedDrinkIds);
    if (els.btnDeleteSelectedDrinks) {
      const n = selectedSet.size;
      els.btnDeleteSelectedDrinks.classList.toggle("hidden", n === 0);
      els.btnDeleteSelectedDrinks.textContent = n ? `Delete selected (${n})` : "Delete selected";
    }

    const drinkIds = state.drinks.order
      .filter((id) => state.drinks.byId[id])
      .filter((id) => {
        if (!qTokens.length) return true;
        const d = state.drinks.byId[id];
        const detectedMilk = detectMilkVariantName(d);
        const detectedTemp = detectTempLabel(d);
        const detectedSize = detectSizeToken(d);
        const variantTitle = drinkVariantListTitle(d);
        const cupId = d?.container?.cupId || null;
        const cup = cupId ? state.cups.byId[cupId] : null;
        const cupText = cup ? `${cup.name || ""} ${cupSizeLabelWithTemp(cup) || ""} ${cupTempLabel(cup) || ""}`.trim() : "";
        const familyKey = libraryFamilyKeyForDrinkId(id);
        const familyCategoryText = familyCategoryMap[familyKey] ? Array.from(familyCategoryMap[familyKey]).join(" ") : "";
	        const haystack = normalizeSimpleLabel([
	          d.name || "",
	          d.category || "",
          familyCategoryText,
	          d.sizeLabel || "",
	          detectedMilk || "",
	          detectedTemp || "",
	          detectedSize || "",
	          variantTitle || "",
	          drinkVariantListTitleSimple(d) || "",
	          cupText || "",
	        ].join(" "));

	        return qTokens.every((tok) => haystack.includes(tok));
	      });

    if (!drinkIds.length) {
      const hasAny = state.drinks.order.some((id) => state.drinks.byId[id]);
      if (hasAny && qTokens.length) {
        els.libraryListWrap.innerHTML = `<div class="list"><div class="list-item"><div class="muted small">No matches for “${escapeHtml(rawQuery)}”.</div></div></div>`;
        els.libraryDetailWrap.innerHTML = `<div class="card-b"><div class="muted small">Try searching by size (e.g. “12oz”), milk, or category.</div></div>`;
      } else {
        els.libraryListWrap.innerHTML = `<div class="list"><div class="list-item"><div class="muted small">No saved drinks yet.</div></div></div>`;
        els.libraryDetailWrap.innerHTML = `<div class="card-b"><div class="muted small">Save a drink in Builder to see it here.</div></div>`;
      }
      return;
    }

    if (!state.ui.selectedLibraryDrinkId || !state.drinks.byId[state.ui.selectedLibraryDrinkId]) {
      state.ui.selectedLibraryDrinkId = drinkIds[0];
    }

    // Normalize any old "mode:key" style into just "key"
    if (state.ui.selectedLibraryFamilyKey && String(state.ui.selectedLibraryFamilyKey).includes(":")) {
      const parts = String(state.ui.selectedLibraryFamilyKey).split(":");
      state.ui.selectedLibraryFamilyKey = parts[parts.length - 1] || "";
    }

    const groups = [];
    const groupByKey = {};
    for (const id of drinkIds) {
      const d = state.drinks.byId[id];
      const family = String(d?.name || "").trim() || "Unnamed";
      const key = familyKeyOf(family) || `__${id}`;
      if (!groupByKey[key]) {
        groupByKey[key] = { key, family, ids: [] };
        groups.push(groupByKey[key]);
      }
      groupByKey[key].ids.push(id);
    }

    const sortMode = getLibrarySortMode();
    groups.sort((a, b) => collator.compare(a.family, b.family));
    for (const g of groups) {
      g.ids.sort((aId, bId) => {
        const a = state.drinks.byId[aId];
        const b = state.drinks.byId[bId];
        const aTitle = libraryListTitle(a) || a?.name || "";
        const bTitle = libraryListTitle(b) || b?.name || "";
        const c = collator.compare(aTitle, bTitle);
        if (c !== 0) return c;
        return collator.compare(String(aId), String(bId));
      });
    }

    const renderFamilyGroup = (g) => {
        const collapsed = !!state.ui.libraryFamilyCollapsed[g.key];
        const caret = collapsed ? "▶" : "▼";
        const isFamilyActive = state.ui.selectedLibraryFamilyKey === g.key;
        const deleteBtn = isFamilyActive
          ? `<button class="btn danger small" type="button" data-action="delete-family" data-family-key="${escapeAttr(g.key)}">Delete</button>`
          : "";
        const header = `
          <div class="list-group-h ${isFamilyActive ? "is-family-active" : ""}" data-family-key="${escapeAttr(g.key)}" role="button" tabindex="0" aria-expanded="${collapsed ? "false" : "true"}">
            <div class="list-title">${escapeHtml(g.family)}</div>
            <div class="list-sub">
              <span class="mono">${g.ids.length} ${g.ids.length === 1 ? "variant" : "variants"}</span>
              ${deleteBtn}
              <span class="mono">${caret}</span>
            </div>
          </div>
        `;

        const items = collapsed
          ? ""
          : g.ids
	              .map((id) => {
	                const d = state.drinks.byId[id];
	                const c = computeDrink(d);
	                const title = libraryListTitle(d) || d.name || "Drink";
	                const taxMode = state?.settings?.taxMode === "inclusive" ? "inclusive" : "additive";
	                const priceValueMills = taxMode === "inclusive" ? c.consumerPriceMills : c.sellPriceMills;
	                return `
	                  <div class="list-item ${id === state.ui.selectedLibraryDrinkId ? "is-active" : ""} ${selectedSet.has(id) ? "is-selected" : ""}" data-drink-id="${id}">
	                    <div class="list-title">${escapeHtml(title)}</div>
	                    <div class="list-sub">
	                      <span>${escapeHtml(d.category || "—")}</span>
	                      <span class="mono">Cost ${formatMoney(c.totalCostMills)}</span>
	                      <span class="mono">Price ${formatMoney(priceValueMills)}</span>
	                      <span class="mono">Margin ${c.sellPriceMills ? `${c.marginPct.toFixed(1)}%` : "—"}</span>
	                      <span class="mono">Card ${c.sellPriceMills ? `${c.marginCardPct.toFixed(1)}%` : "—"}</span>
	                    </div>
	                  </div>
	                `;
	              })
              .join("");

        return `<div class="list-group">${header}${items}</div>`;
      };

    const getGroupCategory = (group) => {
      const byCategory = {};
      for (const id of group.ids || []) {
        const d = state.drinks.byId[id];
        if (!d) continue;
        const label = String(d.category || "").trim();
        const key = label ? drinkCategoryKey(label) : "__uncategorized";
        const safeLabel = label || "Uncategorized";
        if (!byCategory[key]) byCategory[key] = { key, label: safeLabel, count: 0 };
        byCategory[key].count += 1;
      }
      const ranked = Object.values(byCategory).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return collator.compare(a.label, b.label);
      });
      return ranked[0] || { key: "__uncategorized", label: "Uncategorized", count: 0 };
    };

    const getGroupDrinkType = (group) => {
      const byType = {};
      for (const id of group.ids || []) {
        const d = state.drinks.byId[id];
        if (!d) continue;
        const label = detectDrinkTypeLabel(d.name || group.family || "");
        const key = familyKeyOf(label) || "other";
        if (!byType[key]) byType[key] = { key, label, count: 0 };
        byType[key].count += 1;
      }
      const ranked = Object.values(byType).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return collator.compare(a.label, b.label);
      });
      return ranked[0] || { key: "other", label: "Other", count: 0 };
    };

    let list = "";
    if (sortMode === "category" || sortMode === "type") {
      const buckets = [];
      const bucketByKey = {};
      for (const g of groups) {
        const bucket = sortMode === "type" ? getGroupDrinkType(g) : getGroupCategory(g);
        if (!bucketByKey[bucket.key]) {
          bucketByKey[bucket.key] = { key: bucket.key, label: bucket.label, groups: [] };
          buckets.push(bucketByKey[bucket.key]);
        }
        bucketByKey[bucket.key].groups.push(g);
      }
      buckets.sort((a, b) => collator.compare(a.label, b.label));
      list = buckets
        .map(
          (bucket) => `
            <div class="list-category">
              <div class="list-category-h">${escapeHtml(bucket.label)}</div>
              ${bucket.groups.map((g) => renderFamilyGroup(g)).join("")}
            </div>
          `
        )
        .join("");
    } else {
      list = groups.map((g) => renderFamilyGroup(g)).join("");
    }

    if (state.ui.libraryDetailMode === "family") {
      const activeFamilyKey = String(state.ui.selectedLibraryFamilyKey || "");
      if (!activeFamilyKey || !groups.some((g) => g.key === activeFamilyKey)) {
        state.ui.libraryDetailMode = "drink";
      }
    }

    els.libraryListWrap.innerHTML = `<div class="list">${list}</div>`;
    renderLibraryDetail(state.ui.selectedLibraryDrinkId);
  }

  function normalizeModifierScenarioRows(rawRows) {
    if (!Array.isArray(rawRows)) return [];
    const byId = new Map();
    for (const row of rawRows) {
      const modifierId = String(row?.modifierId || "");
      if (!modifierId) continue;
      const mod = state.modifiers?.byId?.[modifierId];
      if (!mod) continue;
      const defaultQty = Number(mod.defaultQty || 1) > 0 ? Number(mod.defaultQty || 1) : 1;
      const qtyRaw = Number(row?.qty);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : defaultQty;
      byId.set(modifierId, { modifierId, qty });
    }
    return Array.from(byId.values());
  }

  function getLibraryModifierScenarioRows(drinkId) {
    const key = String(drinkId || "");
    if (!key) return [];
    if (!state.ui.libraryModifierScenarioByDrink || typeof state.ui.libraryModifierScenarioByDrink !== "object") {
      state.ui.libraryModifierScenarioByDrink = {};
      return [];
    }
    const raw = state.ui.libraryModifierScenarioByDrink[key];
    return normalizeModifierScenarioRows(raw);
  }

  function saveLibraryModifierScenarioRows(drinkId, rows, opts = {}) {
    const key = String(drinkId || "");
    if (!key) return;
    if (!state.ui.libraryModifierScenarioByDrink || typeof state.ui.libraryModifierScenarioByDrink !== "object") {
      state.ui.libraryModifierScenarioByDrink = {};
    }
    const cleaned = [];
    const seen = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      const modifierId = String(row?.modifierId || "");
      if (!modifierId || seen.has(modifierId)) continue;
      const mod = state.modifiers?.byId?.[modifierId];
      if (!mod) continue;
      const qtyRaw = Number(row?.qty);
      if (!Number.isFinite(qtyRaw) || qtyRaw <= 0) continue;
      seen.add(modifierId);
      cleaned.push({ modifierId, qty: qtyRaw });
    }
    if (!cleaned.length) {
      delete state.ui.libraryModifierScenarioByDrink[key];
    } else {
      state.ui.libraryModifierScenarioByDrink[key] = cleaned;
    }
    saveStateDebounced();
    if (opts.rerender !== false) renderLibraryDetail(key);
  }

  function addLibraryModifierScenario(drinkId, modifierId) {
    const key = String(drinkId || "");
    const modifierKey = String(modifierId || "");
    if (!key || !modifierKey) return;
    const mod = state.modifiers?.byId?.[modifierKey];
    if (!mod) return;
    const rows = getLibraryModifierScenarioRows(key);
    const idx = rows.findIndex((row) => row.modifierId === modifierKey);
    const defaultQty = Number(mod.defaultQty || 1) > 0 ? Number(mod.defaultQty || 1) : 1;
    if (idx >= 0) {
      rows[idx].qty = Number(rows[idx].qty || 0) + defaultQty;
    } else {
      rows.push({ modifierId: modifierKey, qty: defaultQty });
    }
    saveLibraryModifierScenarioRows(key, rows);
  }

  function removeLibraryModifierScenario(drinkId, modifierId) {
    const key = String(drinkId || "");
    const modifierKey = String(modifierId || "");
    if (!key || !modifierKey) return;
    const rows = getLibraryModifierScenarioRows(key).filter((row) => row.modifierId !== modifierKey);
    saveLibraryModifierScenarioRows(key, rows);
  }

  function clearLibraryModifierScenario(drinkId) {
    const key = String(drinkId || "");
    if (!key) return;
    saveLibraryModifierScenarioRows(key, []);
  }

  function updateLibraryModifierScenarioQty(drinkId, modifierId, qty) {
    const key = String(drinkId || "");
    const modifierKey = String(modifierId || "");
    if (!key || !modifierKey) return;
    const numericQty = Number(qty);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      removeLibraryModifierScenario(key, modifierKey);
      return;
    }
    const rows = getLibraryModifierScenarioRows(key);
    const idx = rows.findIndex((row) => row.modifierId === modifierKey);
    if (idx < 0) return;
    rows[idx].qty = numericQty;
    saveLibraryModifierScenarioRows(key, rows);
  }

  function computeLibraryModifierScenario(drink, computed, rows) {
    const selectedRows = Array.isArray(rows) ? rows : [];
    const taxMode = computed?.taxMode === "inclusive" ? "inclusive" : "additive";
    const salesTaxPct = drink?.extra?.salesTaxPct == null ? 0 : clamp(Number(drink.extra.salesTaxPct) || 0, 0, 99.999);
    const rate = salesTaxPct > 0 ? salesTaxPct / 100 : 0;
    const baseDisplaySellMills = taxMode === "inclusive" ? Number(computed.consumerPriceMills || 0) : Number(computed.sellPriceMills || 0);

    const applied = [];
    let totalModifierCostDeltaMills = 0;
    let totalModifierPriceDeltaMills = 0;
    for (const row of selectedRows) {
      const modifierId = String(row?.modifierId || "");
      const modifier = state.modifiers?.byId?.[modifierId];
      if (!modifier) continue;
      const qty = Number(row?.qty);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const unitCostDeltaMills = Math.max(0, Number(modifier.costDeltaMills || 0));
      const unitPriceDeltaMills = Math.max(0, Number(modifier.priceDeltaMills || 0));
      const costDeltaMills = Math.round(qty * unitCostDeltaMills);
      const priceDeltaMills = Math.round(qty * unitPriceDeltaMills);
      totalModifierCostDeltaMills += costDeltaMills;
      totalModifierPriceDeltaMills += priceDeltaMills;
      applied.push({
        modifierId,
        name: modifier.name || "Modifier",
        qty,
        unitCostDeltaMills,
        unitPriceDeltaMills,
        costDeltaMills,
        priceDeltaMills,
      });
    }
    applied.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const displaySellMills = Math.max(0, baseDisplaySellMills + totalModifierPriceDeltaMills);
    const totalCostMills = Math.max(0, Number(computed.totalCostMills || 0) + totalModifierCostDeltaMills);

    let sellPriceMills = displaySellMills;
    let consumerPriceMills = displaySellMills;
    let consumerTaxMills = 0;
    if (displaySellMills > 0 && rate > 0) {
      if (taxMode === "inclusive") {
        const net = Math.round(displaySellMills / (1 + rate));
        sellPriceMills = net;
        consumerPriceMills = displaySellMills;
        consumerTaxMills = displaySellMills - net;
      } else {
        sellPriceMills = displaySellMills;
        consumerTaxMills = Math.round(displaySellMills * rate);
        consumerPriceMills = displaySellMills + consumerTaxMills;
      }
    } else if (taxMode === "inclusive") {
      sellPriceMills = displaySellMills;
      consumerPriceMills = displaySellMills;
    } else {
      sellPriceMills = displaySellMills;
      consumerPriceMills = displaySellMills;
    }

    const ccFeePct = state.settings.ccFeePct == null ? 0 : clamp(Number(state.settings.ccFeePct) || 0, 0, 20);
    const ccFeeFixedMills = state.settings.ccFeeFixedMills == null ? 0 : Math.max(0, Number(state.settings.ccFeeFixedMills) || 0);
    const ccFeeMills =
      consumerPriceMills > 0 ? Math.round(consumerPriceMills * (ccFeePct / 100)) + ccFeeFixedMills : 0;
    const profitMills = sellPriceMills - totalCostMills;
    const profitCardMills = profitMills - ccFeeMills;
    const marginPct = sellPriceMills > 0 ? (profitMills / sellPriceMills) * 100 : 0;
    const marginCardPct = sellPriceMills > 0 ? (profitCardMills / sellPriceMills) * 100 : 0;

    return {
      applied,
      hasScenario: applied.length > 0,
      totalModifierCostDeltaMills,
      totalModifierPriceDeltaMills,
      displaySellMills,
      sellPriceMills,
      consumerPriceMills,
      consumerTaxMills,
      totalCostMills,
      profitMills,
      profitCardMills,
      marginPct,
      marginCardPct,
      ccFeeMills,
    };
  }

	  function renderLibraryDetail(drinkId) {
    const detailMode = state.ui.libraryDetailMode === "family" ? "family" : "drink";
    const activeFamilyKey = String(state.ui.selectedLibraryFamilyKey || "");
    if (detailMode === "family" && activeFamilyKey) {
      const familyIds = getLibraryFamilyDrinkIdsByKey(activeFamilyKey);
      if (familyIds.length) {
        const familyDrinks = familyIds.map((id) => state.drinks.byId[id]).filter(Boolean);
        const first = familyDrinks[0];
        const familyName = String(first?.name || "").trim() || "Unnamed";
        const categoryText = Array.from(
          new Set(
            familyDrinks
              .map((d) => String(d?.category || "").trim())
              .filter(Boolean)
          )
        ).join(" • ");
        const cupLabels = Array.from(
          new Set(
            familyDrinks
              .map((d) => {
                const cupId = String(d?.container?.cupId || "");
                const cup = cupId ? state.cups.byId[cupId] : null;
                return cup ? cupSizeLabelWithTemp(cup) || cup.name || "" : "";
              })
              .filter(Boolean)
          )
        );
        const milkLabels = Array.from(
          new Set(
            familyDrinks
              .map((d) => String(detectMilkVariantName(d) || "").trim())
              .filter(Boolean)
          )
        );

        const header = `
          <div class="card-h">
            <div>
              <h2>${escapeHtml(familyName)}</h2>
              <p class="muted">${escapeHtml(categoryText || "Family profile")}</p>
            </div>
            <div class="card-actions">
              <button class="btn" data-action="load-family" data-family-key="${escapeAttr(activeFamilyKey)}" type="button">Load profile</button>
            </div>
          </div>
        `;
        const body = `
          <div class="card-b">
            <div class="kpi">
              <div class="tile">
                <div class="k">Variants</div>
                <div class="v">${familyDrinks.length}</div>
                <div class="s">Saved under this drink title</div>
              </div>
              <div class="tile">
                <div class="k">Cup sizes</div>
                <div class="v">${cupLabels.length || "—"}</div>
                <div class="s">${escapeHtml(cupLabels.join(" • ") || "—")}</div>
              </div>
              <div class="tile">
                <div class="k">Milks</div>
                <div class="v">${milkLabels.length || "—"}</div>
                <div class="s">${escapeHtml(milkLabels.join(" • ") || "—")}</div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="muted small">Load profile combines this family into one Builder profile and keeps cup-size ingredient columns.</div>
          </div>
        `;
        els.libraryDetailWrap.innerHTML = `${header}${body}`;
        return;
      }
    }

	    const d = state.drinks.byId[drinkId];
	    if (!d) {
	      els.libraryDetailWrap.innerHTML = `<div class="card-b"><div class="muted small">Select a drink.</div></div>`;
	      return;
	    }

			    const computed = computeDrink(d);
			    const taxMode = computed?.taxMode === "inclusive" ? "inclusive" : "additive";
			    const salesTaxLabel = trimZeros(Number(d.extra?.salesTaxPct || 0));
          const modifierScenarioRows = getLibraryModifierScenarioRows(d.id);
          const modifierScenario = computeLibraryModifierScenario(d, computed, modifierScenarioRows);
          const effectiveSellingValueMills = modifierScenario.displaySellMills;
          const effectiveSellPriceMills = modifierScenario.sellPriceMills;
          const effectiveConsumerPriceMills = modifierScenario.consumerPriceMills;
          const effectiveConsumerTaxMills = modifierScenario.consumerTaxMills;
          const effectiveTotalCostMills = modifierScenario.totalCostMills;
          const effectiveProfitMills = modifierScenario.profitMills;
          const effectiveProfitCardMills = modifierScenario.profitCardMills;
          const effectiveMarginPct = modifierScenario.marginPct;
          const effectiveMarginCardPct = modifierScenario.marginCardPct;

			    const consumerTaxHint =
			      effectiveSellPriceMills > 0 && effectiveConsumerTaxMills > 0
			        ? `${salesTaxLabel}% = ${formatMoney(effectiveConsumerTaxMills)}`
			        : "—";
			    const priceHint = (() => {
			      if (!(computed.baseSellPriceMills > 0)) return "Set a selling price in Builder.";
			      const parts = [];
			      if (computed.milkUpchargeMills > 0) parts.push(`milk upcharge ${formatMoney(computed.milkUpchargeMills)}`);
			      if (computed.ingredientUpchargeMills > 0) parts.push(`ingredient upcharges ${formatMoney(computed.ingredientUpchargeMills)}`);
            if (modifierScenario.hasScenario) {
              parts.push(`modifier scenario +${formatMoney(modifierScenario.totalModifierPriceDeltaMills)}`);
            }
			      return parts.length ? `Base ${formatMoney(computed.baseSellPriceMills)} + ${parts.join(" + ")}` : "—";
			    })();
			    const sellingLabel = taxMode === "inclusive" ? "Selling price (tax included)" : "Selling price";
			    const sellingHint =
			      taxMode === "inclusive" && computed.baseSellPriceMills > 0 && effectiveConsumerTaxMills > 0
			        ? `${priceHint === "—" ? "" : `${priceHint} • `}Includes ${salesTaxLabel}% = ${formatMoney(effectiveConsumerTaxMills)}`
			        : priceHint;

          const activeModifierRows = activeModifiers();
          const modifierOptions = activeModifierRows
            .map((mod) => `<option value="${escapeAttr(mod.id)}">${escapeHtml(mod.name || "Modifier")}</option>`)
            .join("");
          const scenarioRowsMarkup = !modifierScenario.applied.length
            ? `<div class="muted small">No modifiers selected for this drink.</div>`
            : `
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Modifier</th>
                        <th class="right">Qty</th>
                        <th class="right">Cost +</th>
                        <th class="right">Price +</th>
                        <th class="right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${modifierScenario.applied
                        .map(
                          (row) => `
                        <tr>
                          <td>${escapeHtml(row.name)}</td>
                          <td class="right">
                            <input
                              inputmode="decimal"
                              data-library-modifier-qty
                              data-drink-id="${escapeAttr(d.id)}"
                              data-modifier-id="${escapeAttr(row.modifierId)}"
                              value="${escapeAttr(trimZeros(row.qty))}"
                              style="max-width: 88px; text-align: right;"
                            />
                          </td>
                          <td class="right mono">${formatMoney(row.costDeltaMills)}</td>
                          <td class="right mono">${formatMoney(row.priceDeltaMills)}</td>
                          <td class="right">
                            <button class="btn danger small" type="button" data-action="remove-library-modifier" data-drink-id="${escapeAttr(
                              d.id
                            )}" data-modifier-id="${escapeAttr(row.modifierId)}">Remove</button>
                          </td>
                        </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `;
          const modifierScenarioSection = `
            <div class="divider"></div>
            <div class="section-h">
              <h3>Modifier Scenario</h3>
              <div class="section-actions">
                <button class="btn small" type="button" data-action="clear-library-modifiers" data-drink-id="${escapeAttr(d.id)}">Clear</button>
              </div>
            </div>
            <div class="form-grid">
              <div class="span2">
                <label>Apply saved modifier</label>
                <div class="with-btn">
                  <select data-library-modifier-select="${escapeAttr(d.id)}" ${modifierOptions ? "" : "disabled"}>
                    <option value="">Select modifier…</option>
                    ${modifierOptions}
                  </select>
                  <button class="btn" type="button" data-action="add-library-modifier" data-drink-id="${escapeAttr(d.id)}" ${
                    modifierOptions ? "" : "disabled"
                  }>Add</button>
                </div>
                <p class="hint">Simulation only. This does not save modifiers to the base drink profile.</p>
              </div>
            </div>
            ${scenarioRowsMarkup}
          `;
		    // Keep subtitle short (family/name is already the header)
		    const variantLine = (() => {
		      const size = detectSizeToken(d) || String(d?.sizeLabel || "").trim();
		      const temp = detectTempLabel(d);
      const milk = detectMilkVariantName(d);
      return [size, temp, milk].filter(Boolean).join(" ");
    })();
    const header = `
      <div class="card-h">
        <div>
          <h2>${escapeHtml(d.name)}</h2>
          <p class="muted">${escapeHtml([variantLine, d.category].filter(Boolean).join(" • ") || "—")}</p>
        </div>
        <div class="card-actions">
          <button class="btn" data-action="duplicate" data-drink-id="${d.id}" type="button">Duplicate</button>
          <button class="btn" data-action="edit" data-drink-id="${d.id}" type="button">Load profile</button>
          <button class="btn danger" data-action="delete" data-drink-id="${d.id}" type="button">Delete</button>
        </div>
      </div>
    `;

    const lines = computed.lines
      .map((l) => {
        const qtyStr = l.isUpcharge ? "—" : `${trimZeros(l.qty)} ${escapeHtml(l.unit)}`;
        const costStr = l.isUpcharge ? `+${formatMoney(l.costMills)}` : formatMoney(l.costMills);
        const missingHint = l.missing ? `<div class="muted small">Missing ingredient</div>` : "";
        return `
          <tr>
            <td><b>${escapeHtml(l.name)}</b><div class="muted small">${escapeHtml(l.category || "")}</div></td>
            <td class="right mono">${qtyStr}</td>
            <td class="right mono">${costStr}${missingHint}</td>
          </tr>
        `;
      })
      .join("");

		    const breakdown = `
		      <div class="card-b">
		        <div class="kpi">
		          <div class="tile">
		            <div class="k">Total cost</div>
		            <div class="v">${formatMoney(effectiveTotalCostMills)}</div>
		            <div class="s">${formatMoney(computed.itemsCostMills)} ingredients${
                  computed.missingCount ? ` • Missing: ${computed.missingCount}` : ""
                }${modifierScenario.hasScenario ? ` • +${formatMoney(modifierScenario.totalModifierCostDeltaMills)} modifiers` : ""}</div>
		          </div>
				          <div class="tile">
				            <div class="k">${sellingLabel}</div>
				            <div class="v">${formatMoney(effectiveSellingValueMills)}</div>
				            <div class="s">${sellingHint}</div>
				          </div>
			          ${
			            taxMode === "inclusive"
			              ? ""
			              : `<div class="tile">
			            <div class="k">Consumer price (with tax)</div>
		            <div class="v">${formatMoney(effectiveConsumerPriceMills)}</div>
		            <div class="s">${consumerTaxHint}</div>
		          </div>`
		          }
	          <div class="tile">
	            <div class="k">Profit</div>
	            <div class="v">${formatMoney(effectiveProfitMills)}</div>
	            <div class="s">${effectiveSellPriceMills ? "—" : "—"}</div>
	          </div>
          <div class="tile">
            <div class="k">Profit (card)</div>
            <div class="v">${formatMoney(effectiveProfitCardMills)}</div>
            <div class="s">${effectiveSellPriceMills ? `Fee: ${formatMoney(modifierScenario.ccFeeMills)}` : "—"}</div>
          </div>
          <div class="tile">
            <div class="k">Margin</div>
            <div class="v">${effectiveSellPriceMills ? `${effectiveMarginPct.toFixed(1)}%` : "—"}</div>
            <div class="s">${effectiveSellPriceMills ? "—" : "—"}</div>
          </div>
          <div class="tile">
            <div class="k">Margin (card)</div>
            <div class="v">${effectiveSellPriceMills ? `${effectiveMarginCardPct.toFixed(1)}%` : "—"}</div>
            <div class="s">${effectiveSellPriceMills ? "—" : "—"}</div>
          </div>
        </div>
        ${modifierScenarioSection}
        <div class="divider"></div>
        <div class="section-h"><h3>Recipe breakdown</h3></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Line</th><th class="right">Qty</th><th class="right">Cost</th></tr>
            </thead>
            <tbody>
              ${lines}
              <tr><td><b>Total</b></td><td class="right mono">—</td><td class="right mono"><b>${formatMoney(
                effectiveTotalCostMills
              )}</b></td></tr>
            </tbody>
          </table>
        </div>
        ${d.notes ? `<div class="divider"></div><div class="muted small"><b>Notes:</b> ${escapeHtml(d.notes)}</div>` : ""}
      </div>
    `;

    els.libraryDetailWrap.innerHTML = `${header}${breakdown}`;
  }

  function syncSettingsUIFromState() {
    els.currencyCode.value = state.meta.currency || "USD";
    applyThemeFromState();
    const mode = state?.settings?.taxMode === "inclusive" ? "inclusive" : "additive";
    els.taxModeAdditive?.classList.toggle("is-active", mode === "additive");
    els.taxModeInclusive?.classList.toggle("is-active", mode === "inclusive");
    renderSquareSalesReport();
  }

  function syncCurrencyUI() {
    const symbol = currencySymbol(state.meta.currency);
    els.currencyPrefixes.forEach((s) => (s.textContent = symbol));
  }

  // ---------- Computation ----------
  function isWeightUnit(key) {
    return key === "g" || key === "oz";
  }

  function isVolumeUnit(key) {
    return (
      key === "ml" ||
      key === "l" ||
      key === "floz" ||
      key === "quart" ||
      key === "half_gallon" ||
      key === "gallon"
    );
  }

  function toGrams(amount, unitKey) {
    if (unitKey === "g") return amount;
    if (unitKey === "oz") return amount * G_PER_OZ;
    return null;
  }

  function toMilliliters(amount, unitKey) {
    if (unitKey === "ml") return amount;
    if (unitKey === "l") return amount * 1000;
    if (unitKey === "floz") return amount * ML_PER_FL_OZ;
    if (unitKey === "quart") return amount * ML_PER_QUART;
    if (unitKey === "half_gallon") return amount * (ML_PER_GALLON / 2);
    if (unitKey === "gallon") return amount * ML_PER_GALLON;
    return null;
  }

  function convertPurchaseAmountToIngredientUnits({
    unitKey,
    purchaseAmount,
    purchaseAmountUnitKey,
  }) {
    const amount = Number(purchaseAmount || 0);
    if (!(amount > 0)) return { ok: false, error: "Purchase amount must be greater than 0." };

    const pu = purchaseAmountUnitKey;

    if (unitKey === "each" || unitKey === "custom") {
      if (pu !== "each") {
        return { ok: false, error: "For 'each/custom' ingredients, purchase unit must be Each." };
      }
      return {
        ok: true,
        amountInIngredientUnits: amount,
      };
    }

    const unitIsWeight = isWeightUnit(unitKey);
    const unitIsVolume = unitKey === "ml";
    const purchaseIsWeight = isWeightUnit(pu);
    const purchaseIsVolume = isVolumeUnit(pu);

    if (!unitIsWeight && !unitIsVolume) {
      return { ok: false, error: "Unsupported ingredient unit." };
    }
    if (!purchaseIsWeight && !purchaseIsVolume) {
      return { ok: false, error: "Unsupported purchase unit." };
    }

    if (unitIsWeight) {
      if (purchaseIsWeight) {
        const grams = toGrams(amount, pu);
        if (grams == null) return { ok: false, error: "Unsupported purchase unit." };
        const amountInIngredientUnits = unitKey === "g" ? grams : grams / G_PER_OZ;
        return { ok: true, amountInIngredientUnits };
      }
      // No density input (by request). Assume 1.0 g/ml for volume↔weight conversions.
      const ml = toMilliliters(amount, pu);
      if (ml == null) return { ok: false, error: "Unsupported purchase unit." };
      const grams = ml * 1.0;
      const amountInIngredientUnits = unitKey === "g" ? grams : grams / G_PER_OZ;
      return { ok: true, amountInIngredientUnits };
    }

    // unitIsVolume (ml)
    if (purchaseIsVolume) {
      const ml = toMilliliters(amount, pu);
      if (ml == null) return { ok: false, error: "Unsupported purchase unit." };
      return { ok: true, amountInIngredientUnits: ml };
    }
    // No density input (by request). Assume 1.0 g/ml for volume↔weight conversions.
    const grams = toGrams(amount, pu);
    if (grams == null) return { ok: false, error: "Unsupported purchase unit." };
    const ml = grams / 1.0;
    return { ok: true, amountInIngredientUnits: ml };
  }

  function ingredientCostPerUnitMills(ing) {
    return ingredientCostInfo(ing).costPerUnitMills;
  }

  function ingredientCostInfo(ing) {
    const override = Number(ing?.unitCostOverrideMills || 0);
    if (override > 0) {
      return { costPerUnitMills: override, hint: "Manual override per reporting unit." };
    }

    if (ing.unitKey === "coffee_pricing") {
      const pricePerLbMills = Number(ing.coffeePricePerLbMills || 0);
      const doseGrams = Number(ing.coffeeDoseGrams || 0);
      if (!(pricePerLbMills > 0) || !(doseGrams > 0)) return { costPerUnitMills: 0, hint: "—" };
      const gramsPerLb = 453.59237;
      const millsPerGram = pricePerLbMills / gramsPerLb;
      return { costPerUnitMills: millsPerGram * doseGrams, hint: "—" };
    }

    const price = Number(ing.purchasePriceMills || 0);
    const amount = Number(ing.purchaseAmount || 0);
    if (!(price > 0) || !(amount > 0)) {
      return { costPerUnitMills: 0, hint: "—" };
    }

    const purchaseUnitKey =
      ing.purchaseAmountUnitKey || (ing.unitKey === "custom" ? "each" : ing.unitKey);

    const converted = convertPurchaseAmountToIngredientUnits({
      unitKey: ing.unitKey,
      purchaseAmount: amount,
      purchaseAmountUnitKey: purchaseUnitKey,
    });
    if (!converted.ok || !(converted.amountInIngredientUnits > 0)) {
      return {
        costPerUnitMills: 0,
        hint: "—",
      };
    }

    let base = price / converted.amountInIngredientUnits;
    return { costPerUnitMills: base, hint: "—" };
  }

		  function computeDrink(drink) {
		    const taxMode = state?.settings?.taxMode === "inclusive" ? "inclusive" : "additive";
		    const baseSellPriceMills = Number(drink?.pricing?.sellPriceMills || 0);
		    const milkUpchargeMills = baseSellPriceMills > 0 ? getMilkUpchargeMills(drink) : 0;
		    const salesTaxPct = drink?.extra?.salesTaxPct == null ? 0 : clamp(Number(drink.extra.salesTaxPct) || 0, 0, 99.999);

	    const lines = [];
	    let itemsCostMills = 0;
	    let missingCount = 0;
	    const ingredientUpchargeEntriesByKey = new Map();
	    const milkIngredientIdInDrink = baseSellPriceMills > 0 ? detectMilkIngredientIdFromItems(drink) : "";
    const selectedMilkId = baseSellPriceMills > 0 ? resolveMilkLibraryIdForDrink(drink) : "";
    const selectedMilk = selectedMilkId ? state.milks.byId[selectedMilkId] : null;
    const selectedMilkIsWhole = !!selectedMilk && isWholeMilkLibraryEntry(selectedMilk);
    const selectedMilkManualUpchargeMills = selectedMilkIsWhole
      ? Math.max(0, Number(selectedMilk?.upchargeMills || 0))
      : 0;

    // Cup selected in the Drink section (uses Cup Library)
    const cupId = drink?.container?.cupId || null;
    const cupEachQty = 1;
    if (cupId) {
      const cup = state.cups.byId[cupId] || null;
      if (!cup) {
        missingCount += 1;
        lines.push({
          ingredientId: `cup:${cupId}`,
          name: "Missing cup",
          category: "Deleted / not found",
          qty: cupEachQty,
          unit: "each",
          costMills: 0,
          missing: true,
        });
      } else {
        const cpu = cupCostPerEachMills(cup);
        const costMills = Math.round(cupEachQty * cpu);
        itemsCostMills += costMills;
        lines.push({
          ingredientId: `cup:${cup.id}`,
          name: cup.name || "Cup",
          category: "Cup",
          qty: cupEachQty,
          unit: "each",
          costMills,
          missing: false,
        });
      }
    }

		    for (const it of drink?.items || []) {
		      const qty = Math.max(0, Number(it.qty || 0));
		      const ing = it.ingredientId ? state.ingredients.byId[it.ingredientId] : null;
		      if (!it.ingredientId) continue;
		      if (!ing) {
        missingCount += 1;
        lines.push({
          ingredientId: it.ingredientId,
          name: "Missing ingredient",
          category: "Deleted / not found",
          qty,
          unit: "—",
          costMills: 0,
          missing: true,
        });
	        continue;
	      }

		      if (qty > 0 && baseSellPriceMills > 0 && !!it.includeUpcharge) {
		        let up = Number(ing.upchargeMills || 0);
          const isSelectedMilk = milkIngredientIdInDrink && ing.id === milkIngredientIdInDrink;
          if (isSelectedMilk && selectedMilkManualUpchargeMills > 0) {
            up = selectedMilkManualUpchargeMills;
          }
          if (up > 0) {
            const entryKey = `ingredient:${String(ing.id || "")}`;
		        if (!ingredientUpchargeEntriesByKey.has(entryKey)) {
		          // Avoid double-counting when Milk Library already applies an upcharge.
		          if (isSelectedMilk && milkUpchargeMills > 0) {
	            // handled by milkUpchargeMills
	          } else {
	            ingredientUpchargeEntriesByKey.set(entryKey, { id: entryKey, name: ing.name || "Ingredient", upchargeMills: up });
	          }
	        }
          }
	      }
	      const cpu = ingredientCostPerUnitMills(ing);
	      const costMills = Math.round(qty * cpu);
	      itemsCostMills += costMills;
      lines.push({
        ingredientId: ing.id,
        name: ing.name || "Ingredient",
        category: ing.category || "",
        qty,
        unit: unitLabel(ing),
        costMills,
	        missing: false,
	      });
	    }

	    let ingredientUpchargeMills = 0;
	    const ingredientUpchargeEntries = [];
	    if (baseSellPriceMills > 0) {
	      for (const v of ingredientUpchargeEntriesByKey.values()) {
	        const up = Number(v?.upchargeMills || 0);
	        if (up > 0) {
	          ingredientUpchargeMills += up;
	          ingredientUpchargeEntries.push(v);
	        }
	      }
	    }

    const modifierScenarioRows = normalizeModifierScenarioRows(drink?.modifierScenarioRows);
    let modifierCostMills = 0;
    let modifierUpchargeMills = 0;
    const modifierCostEntries = [];
    if (modifierScenarioRows.length) {
      for (const row of modifierScenarioRows) {
        const modifier = state.modifiers?.byId?.[String(row.modifierId || "")];
        if (!modifier) continue;
        const qty = Number(row.qty);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        const costDeltaMills = Math.round(qty * Math.max(0, Number(modifier.costDeltaMills || 0)));
        const priceDeltaMills = Math.round(qty * Math.max(0, Number(modifier.priceDeltaMills || 0)));
        modifierCostMills += costDeltaMills;
        if (baseSellPriceMills > 0) modifierUpchargeMills += priceDeltaMills;
        if (costDeltaMills > 0) {
          modifierCostEntries.push({
            modifierId: modifier.id,
            name: modifier.name || "Modifier",
            qty,
            costDeltaMills,
          });
        }
      }
    }

		    const grossSellPriceMills = baseSellPriceMills + milkUpchargeMills + ingredientUpchargeMills + modifierUpchargeMills;

	    if (milkUpchargeMills > 0) {
	      const milkName = detectMilkVariantName(drink) || "Milk";
	      const milkKey = resolveMilkLibraryIdForDrink(drink) || "milk";
	      lines.push({
        ingredientId: `milk_upcharge:${milkKey}`,
        name: "Milk upcharge",
        category: milkName,
        qty: 1,
        unit: "—",
        costMills: milkUpchargeMills,
        missing: false,
	        isUpcharge: true,
	      });
	    }

	    if (ingredientUpchargeEntries.length) {
	      for (const v of ingredientUpchargeEntries) {
	        lines.push({
	          ingredientId: `ing_upcharge:${v.id}`,
	          name: v.name || "Ingredient",
	          category: "Upcharge",
	          qty: 1,
	          unit: "—",
	          costMills: Number(v.upchargeMills || 0),
	          missing: false,
	          isUpcharge: true,
	        });
	      }
	    }

    if (modifierCostEntries.length) {
      for (const row of modifierCostEntries) {
        lines.push({
          ingredientId: `modifier_cost:${row.modifierId}`,
          name: row.name || "Modifier",
          category: "Modifier",
          qty: Number(row.qty || 0),
          unit: "x",
          costMills: Number(row.costDeltaMills || 0),
          missing: false,
        });
      }
    }

		    let sellPriceMills = grossSellPriceMills;
		    let consumerTaxMills = 0;
		    let consumerPriceMills = grossSellPriceMills;
		    if (grossSellPriceMills > 0 && salesTaxPct > 0) {
		      const rate = salesTaxPct / 100;
		      if (taxMode === "inclusive") {
		        const net = Math.round(grossSellPriceMills / (1 + rate));
		        sellPriceMills = net;
		        consumerPriceMills = grossSellPriceMills;
		        consumerTaxMills = grossSellPriceMills - net;
		      } else {
		        sellPriceMills = grossSellPriceMills;
		        consumerTaxMills = Math.round(grossSellPriceMills * rate);
		        consumerPriceMills = grossSellPriceMills + consumerTaxMills;
		      }
		    }

		    const totalCostMills = itemsCostMills + modifierCostMills;
		    const profitMills = sellPriceMills - totalCostMills;
		    const marginPct = sellPriceMills > 0 ? (profitMills / sellPriceMills) * 100 : 0;

	    const ccFeePct = state.settings.ccFeePct == null ? 0 : clamp(Number(state.settings.ccFeePct) || 0, 0, 20);
	    const ccFeeFixedMills = state.settings.ccFeeFixedMills == null ? 0 : Math.max(0, Number(state.settings.ccFeeFixedMills) || 0);
	    const ccFeeMills =
	      consumerPriceMills > 0 ? Math.round(consumerPriceMills * (ccFeePct / 100)) + ccFeeFixedMills : 0;
	    const profitCardMills = profitMills - ccFeeMills;
	    const marginCardPct = sellPriceMills > 0 ? (profitCardMills / sellPriceMills) * 100 : 0;

		    return {
		      taxMode,
		      sellPriceMills,
		      baseSellPriceMills,
		      milkUpchargeMills,
		      ingredientUpchargeMills,
          modifierUpchargeMills,
          modifierCostMills,
		      consumerTaxMills,
		      consumerPriceMills,
	      ccFeeMills,
	      profitCardMills,
      marginCardPct,
      itemsCostMills,
      totalCostMills,
      profitMills,
      marginPct,
      lines,
      missingCount,
    };
  }

	  function priceForMarginMills(totalCostMills, marginPct, opts = {}) {
	    const m = clamp(marginPct, 0.001, 99.999) / 100;
	    const net = Math.round(totalCostMills / (1 - m));
	    const mode = opts?.taxMode === "inclusive" ? "inclusive" : "additive";
	    const salesTaxPct =
	      opts?.salesTaxPct == null ? 0 : clamp(Number(opts.salesTaxPct) || 0, 0, 99.999);
	    if (mode === "inclusive" && net > 0 && salesTaxPct > 0) {
	      return Math.round(net * (1 + salesTaxPct / 100));
	    }
	    return net;
	  }

  // ---------- Import / Export ----------
  function exportJSON() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coffee-drink-cost-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Exported JSON.");
  }

  function buildRecipeExportBundle(opts = {}) {
    const allowedCategoryKeys = opts.categoryKeys instanceof Set ? opts.categoryKeys : null;
    const allowedDrinkKeys = opts.drinkKeys instanceof Set ? opts.drinkKeys : null;
    const preferWholeMilk = !!opts.preferWholeMilk;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const categoryFilter = allowedDrinkKeys ? null : allowedCategoryKeys;
    const allGroups = getRecipeExportDrinkGroups({ categoryKeys: categoryFilter });
    const groups = allowedDrinkKeys ? allGroups.filter((g) => allowedDrinkKeys.has(g.key)) : allGroups.slice();
    groups.sort((a, b) => collator.compare(a.title, b.title));
    if (!groups.length) return null;

    const extractOz = (text) => {
      const m = String(text || "").match(/(\d+(?:\.\d+)?)\s*oz\b/i);
      return m ? Number(m[1]) : null;
    };
    const humanizeSize = (token) => String(token || "").replace(/^(\d+(?:\.\d+)?)oz$/i, "$1 oz");
    const collectCupIdsForGroup = (ids) => {
      const out = new Set();
      for (const id of ids || []) {
        const d = state.drinks.byId[id];
        if (!d) continue;
        const cupId = String(d?.container?.cupId || "");
        if (cupId) out.add(cupId);
        if (Array.isArray(d?.container?.cupIdsUsed)) {
          for (const cId of d.container.cupIdsUsed) if (cId) out.add(String(cId));
        }
        if (d.qtyByCup && typeof d.qtyByCup === "object") {
          for (const cId of Object.keys(d.qtyByCup)) if (cId) out.add(String(cId));
        }
      }
      return Array.from(out);
    };
    const cupSortKey = (cupId) => {
      const cup = state.cups.byId[cupId];
      const text = cup ? `${cupSizeLabelWithTemp(cup) || ""} ${cup.name || ""}` : cupId;
      const oz = extractOz(text);
      return { oz: oz == null ? Number.POSITIVE_INFINITY : oz, text: String(text || "").toLowerCase() };
    };
    const pickRepresentativeVariant = (ids, cupId, pickOpts = {}) => {
      const wholeMilkPreferred = !!pickOpts.preferWholeMilk;
      const candidates = (ids || [])
        .map((id) => state.drinks.byId[id])
        .filter(Boolean)
        .filter((d) => String(d?.container?.cupId || "") === cupId || !!(d?.qtyByCup && d.qtyByCup[cupId]));
      if (!candidates.length) return null;
      const score = (d) => {
        let s = 0;
        if (String(d?.container?.cupId || "") !== cupId) s += 5;
        if (detectFlavorIngredientId(d)) s += 20;
        const milk = d?.milkId ? state.milks.byId[d.milkId] : null;
        if (milk && Number(milk.upchargeMills || 0) > 0) s += 1;
        if (wholeMilkPreferred) {
          const milkName = String(detectMilkVariantName(d) || "").toLowerCase();
          const hasWhole = /\bwhole\b/.test(milkName);
          const hasMilk = !!(resolveMilkLibraryIdForDrink(d) || detectMilkIngredientIdFromItems(d));
          if (hasWhole) s -= 1000;
          else if (hasMilk) s += 100;
        }
        let missing = 0;
        for (const it of d?.items || []) {
          if (!it?.ingredientId) continue;
          if (!state.ingredients.byId[it.ingredientId]) missing += 1;
        }
        if (missing) s += 2;
        return s;
      };
      candidates.sort((a, b) => {
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;
        const ua = String(a?.updatedAtIso || "");
        const ub = String(b?.updatedAtIso || "");
        if (ua !== ub) return ub.localeCompare(ua);
        return String(a?.id || "").localeCompare(String(b?.id || ""));
      });
      return candidates[0];
    };
    const recipeLinesForCup = (drink, cupId) => {
      const lines = new Map();
      for (const it of drink?.items || []) {
        const ingId = it?.ingredientId == null ? "" : String(it.ingredientId);
        const ing = ingId ? state.ingredients.byId[ingId] : null;
        if (ing && isCupLikeIngredient(ing)) continue;
        const qtyRaw =
          drink?.qtyByCup && typeof drink.qtyByCup === "object" && drink.qtyByCup[cupId] && Object.prototype.hasOwnProperty.call(drink.qtyByCup[cupId], it.lineId)
            ? drink.qtyByCup[cupId][it.lineId]
            : it?.qty;
        const qty = Math.max(0, Number(parseDecimalOrNull(qtyRaw) || 0));
        if (!(qty > 0)) continue;
        const unit = ing ? unitLabel(ing) : "-";
        const milkName =
          ing && isMilkIngredient(ing) && drink?.milkId && state.milks.byId[drink.milkId]?.ingredientId === ing.id
            ? state.milks.byId[drink.milkId].name || ing.name
            : ing?.name;
        const name = String(milkName || ing?.name || "[Missing ingredient]").trim() || "[Missing ingredient]";
        const key = `${ingId || name}|${unit}`;
        if (lines.has(key)) lines.get(key).qty += qty;
        else lines.set(key, { name, unit, qty });
      }
      return Array.from(lines.values());
    };

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const title = `Coffee Drink Recipes (${dateStr})`;
    const outGroups = [];
    for (const g of groups) {
      const cupIds = collectCupIdsForGroup(g.ids)
        .filter((id) => !!id)
        .sort((a, b) => {
          const ka = cupSortKey(a);
          const kb = cupSortKey(b);
          if (ka.oz !== kb.oz) return ka.oz - kb.oz;
          return ka.text.localeCompare(kb.text);
        });
      if (!cupIds.length) continue;
      const first = state.drinks.byId[g.ids[0]];
      const category = recipeCategoryLabel(first?.category);
      const cups = [];
      for (const cupId of cupIds) {
        const rep = pickRepresentativeVariant(g.ids, cupId, { preferWholeMilk });
        if (!rep) continue;
        const cup = state.cups.byId[cupId] || null;
        const labelDrink = { ...rep, container: { ...(rep.container || {}), cupId } };
        const size = humanizeSize(detectSizeToken(labelDrink)) || String(cup?.sizeLabel || "").trim() || "";
        const temp = detectTempLabel(labelDrink);
        const cupName = String(cup?.name || "").trim();
        const cupHeading = [size, temp].filter(Boolean).join(" ").trim() || cupName || "Cup";
        const cupSub = [cupName, cupSizeLabelWithTemp(cup)].filter(Boolean).join(" - ");
        const lines = recipeLinesForCup(rep, cupId);
        if (!lines.length) continue;
        cups.push({
          cupId,
          heading: cupHeading,
          sub: cupSub,
          notes: String(rep?.notes || "").trim(),
          lines,
        });
      }
      if (!cups.length) continue;
      outGroups.push({
        title: g.title || g.family || "Drink",
        category,
        cups,
      });
    }
    if (!outGroups.length) return null;
    return { dateStr, title, groups: outGroups };
  }

  function recipeBundleToPrintableHtml(bundle) {
    const chunks = [];
    chunks.push(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(bundle.title)}</title>
  <style>
    :root{ color-scheme: light; }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color:#0f172a; background:#ffffff; }
    h1{ margin: 0 0 6px; font-size: 24px; }
    .sub{ color:#475569; font-size: 12px; margin: 0 0 18px; }
    .drink{ border:1px solid #e2e8f0; border-radius: 14px; padding: 14px 14px 10px; margin: 14px 0; break-inside: avoid; }
    .drink h2{ margin: 0 0 2px; font-size: 18px; }
    .meta{ color:#64748b; font-size: 12px; margin: 0 0 8px; }
    .cup{ margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
    .cup h3{ margin: 0 0 8px; font-size: 14px; color:#0f172a; }
    table{ width: 100%; border-collapse: collapse; }
    th,td{ padding: 7px 6px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
    th{ text-align: left; font-size: 12px; color:#475569; }
    td.qty{ text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .notes{ margin: 8px 0 0; font-size: 12px; color:#475569; white-space: pre-wrap; }
    @media print{
      body{ margin: 0.6in; }
      .drink{ page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(bundle.title)}</h1>
  <p class="sub">Ingredient amounts only (no costs).</p>
`);
    for (const g of bundle.groups) {
      chunks.push(`<section class="drink">
  <h2>${escapeHtml(g.title)}</h2>
  <div class="meta">${escapeHtml(g.category || "-")}</div>`);
      for (const cup of g.cups) {
        chunks.push(`<div class="cup">
  <h3>${escapeHtml(cup.heading)}${cup.sub ? ` <span class="meta">(${escapeHtml(cup.sub)})</span>` : ""}</h3>
  <table>
    <thead><tr><th>Ingredient</th><th class="qty">Amount</th></tr></thead>
    <tbody>
      ${cup.lines
        .map((l) => {
          const qty = `${trimZeros(l.qty)} ${l.unit}`.trim();
          return `<tr><td>${escapeHtml(l.name)}</td><td class="qty">${escapeHtml(qty)}</td></tr>`;
        })
        .join("")}
    </tbody>
  </table>
  ${cup.notes ? `<div class="notes"><b>Notes:</b> ${escapeHtml(cup.notes)}</div>` : ""}
</div>`);
      }
      chunks.push(`</section>`);
    }
    chunks.push(`</body></html>`);
    return chunks.join("\n");
  }

	  function exportRecipesCSV(opts = {}) {
    const selectedCategoryKeys = opts?.categoryKeys instanceof Set ? opts.categoryKeys : null;
    const selectedDrinkKeys = opts?.drinkKeys instanceof Set ? opts.drinkKeys : null;
	    const bundle = buildRecipeExportBundle({
      categoryKeys: selectedCategoryKeys,
      drinkKeys: selectedDrinkKeys,
      preferWholeMilk: true,
    });
	    if (!bundle) {
	      toast("No saved drinks to export.");
	      return;
	    }
    const csvEsc = (value) => {
      const text = String(value == null ? "" : value);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
    };
	    const rows = [["Drink", "Category", "Cup", "Ingredients", "Notes"]];
	    for (const g of bundle.groups) {
	      for (const cup of g.cups) {
	        const notes = cup.notes || "";
	        const ingredientsCell = cup.lines
	          .map((l) => `${l.name}: ${`${trimZeros(l.qty)} ${l.unit}`.trim()}`)
	          .join("\n");
	        rows.push([g.title, g.category || "-", cup.heading, ingredientsCell, notes]);
	      }
	    }
    const csv = rows.map((row) => row.map(csvEsc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coffee-recipes-${bundle.dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Exported recipes for Google Sheets.");
	  }

	  function exportRecipesPDF(opts = {}) {
    const selectedCategoryKeys = opts?.categoryKeys instanceof Set ? opts.categoryKeys : null;
    const selectedDrinkKeys = opts?.drinkKeys instanceof Set ? opts.drinkKeys : null;
	    const bundle = buildRecipeExportBundle({
      categoryKeys: selectedCategoryKeys,
      drinkKeys: selectedDrinkKeys,
      preferWholeMilk: true,
    });
	    if (!bundle) {
	      toast("No saved drinks to export.");
	      return;
	    }
    const html = recipeBundleToPrintableHtml(bundle);
    const win = window.open("", "_blank");
    if (!win) {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coffee-recipes-${bundle.dateStr}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Popup blocked. Downloaded HTML instead.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {}
    }, 150);
    toast("PDF export opened. Choose Save as PDF in the print dialog.");
  }

  function exportRecipes() {
    exportRecipesPDF();
  }

  function parseCsvRows(text) {
    const input = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (inQuotes) {
        if (ch === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        continue;
      }
      if (ch === ",") {
        row.push(field);
        field = "";
        continue;
      }
      if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        continue;
      }
      if (ch === "\r") continue;
      field += ch;
    }
    row.push(field);
    const hasAny = row.some((v) => String(v || "").trim() !== "");
    if (hasAny || rows.length) rows.push(row);
    return rows;
  }

  function normalizeCsvHeaderKey(value) {
    return normalizeSimpleLabel(value).replace(/[^a-z0-9]/g, "");
  }

  function findSquareItemAndQtyColumns(headers) {
    const fields = (headers || []).map((header, idx) => ({
      idx,
      raw: normalizeSimpleLabel(header),
      key: normalizeCsvHeaderKey(header),
    }));
    const findExact = (keys) => {
      const set = new Set(keys);
      const hit = fields.find((f) => set.has(f.key));
      return hit ? hit.idx : -1;
    };
    const itemAliases = [
      "item",
      "itemname",
      "menuitem",
      "productname",
      "displayname",
      "name",
    ];
    const qtyAliases = [
      "qty",
      "quantity",
      "qtysold",
      "quantitysold",
      "itemssold",
      "itemsold",
      "unitssold",
      "soldqty",
      "soldquantity",
      "count",
    ];
    let itemIndex = findExact(itemAliases);
    let qtyIndex = findExact(qtyAliases);
    if (itemIndex < 0) {
      const hit = fields.find((f) => f.raw.includes("item") && (f.raw.includes("name") || f.raw === "item"));
      if (hit) itemIndex = hit.idx;
    }
    if (itemIndex < 0) {
      const hit = fields.find((f) => f.raw.includes("item"));
      if (hit) itemIndex = hit.idx;
    }
    if (qtyIndex < 0) {
      const hit = fields.find((f) => f.raw.includes("qty") || f.raw.includes("quantity") || f.raw.includes("sold"));
      if (hit) qtyIndex = hit.idx;
    }
    const modifierAliases = [
      "modifier",
      "modifiers",
      "modifierapplied",
      "modifiersapplied",
      "appliedmodifiers",
      "itemvariationname",
      "variation",
      "variations",
      "option",
      "options",
      "details",
      "description",
      "itemdetails",
    ];
    const modifierIndexes = fields
      .filter((f) => f.idx !== itemIndex && f.idx !== qtyIndex)
      .filter((f) => {
        if (modifierAliases.includes(f.key)) return true;
        return (
          f.raw.includes("modifier") ||
          f.raw.includes("variation") ||
          f.raw.includes("option") ||
          f.raw.includes("detail")
        );
      })
      .map((f) => f.idx);
    return { itemIndex, qtyIndex, modifierIndexes };
  }

  function normalizeSalesLookup(value) {
    return normalizeSimpleLabel(value).replace(/[^a-z0-9]+/g, " ").trim();
  }

  function squareModifierTokens(text) {
    const stop = new Set(["with", "and", "or", "add", "extra", "light", "no", "the", "a", "an"]);
    return Array.from(
      new Set(
        normalizeSalesLookup(text)
          .split(/\s+/g)
          .filter(Boolean)
          .filter((tok) => tok.length > 1 && !stop.has(tok))
      )
    );
  }

  function squareItemSignatureTokens(text) {
    const generic = new Set([
      "drink",
      "coffee",
      "tea",
      "espresso",
      "shot",
      "double",
      "single",
      "latte",
      "cappuccino",
      "americano",
      "mocha",
      "macchiato",
      "chai",
      "hot",
      "iced",
      "ice",
      "milk",
      "oat",
      "almond",
      "whole",
      "soy",
      "coconut",
      "small",
      "medium",
      "large",
      "size",
      "oz",
    ]);
    return squareModifierTokens(text).filter((tok) => {
      if (!tok) return false;
      if (/^\d+(?:\.\d+)?$/.test(tok)) return false;
      if (/^\d+(?:\.\d+)?oz$/.test(tok)) return false;
      return !generic.has(tok);
    });
  }

  function squareMilkKeyFromText(text) {
    const norm = normalizeSalesLookup(text);
    if (!norm) return "";
    if (/\boat milk\b/.test(norm) || /\boat\b/.test(norm)) return "oat";
    if (/\balmond milk\b/.test(norm) || /\balmond\b/.test(norm)) return "almond";
    if (/\bwhole milk\b/.test(norm) || /\bwhole\b/.test(norm)) return "whole";
    if (/\bsoy milk\b/.test(norm) || /\bsoy\b/.test(norm)) return "soy";
    if (/\bcoconut milk\b/.test(norm) || /\bcoconut\b/.test(norm)) return "coconut";
    return "";
  }

  function squareTempKeyFromText(text) {
    const norm = normalizeSalesLookup(text);
    if (!norm) return "";
    if (/\biced\b/.test(norm)) return "iced";
    if (/\bhot\b/.test(norm)) return "hot";
    return "";
  }

  function squareSizeTokenFromText(text) {
    const norm = normalizeSalesLookup(text);
    if (!norm) return "";
    const m = norm.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
    if (!m) return "";
    const num = String(m[1] || "")
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1");
    return num ? `${num}oz` : "";
  }

  function buildSquareSalesFamilyIndex() {
    const byKey = new Map();
    const list = [];
    for (const id of state.drinks.order || []) {
      const d = state.drinks.byId[id];
      if (!d) continue;
      const family = String(d.name || "").trim();
      if (!family) continue;
      const key = normalizeSalesLookup(family);
      if (!key) continue;
      if (!byKey.has(key)) {
        const row = { key, family, drinkIds: [] };
        byKey.set(key, row);
        list.push(row);
      }
      byKey.get(key).drinkIds.push(id);
    }
    return { byKey, list };
  }

  function findSquareSalesFamilyForItem(itemName, familyIndex) {
    const itemNorm = normalizeSalesLookup(itemName);
    if (!itemNorm) return null;
    if (familyIndex.byKey.has(itemNorm)) return familyIndex.byKey.get(itemNorm);

    const itemSig = squareItemSignatureTokens(itemNorm);
    const itemTokens = itemNorm.split(/\s+/g).filter(Boolean);
    const candidates = [];
    for (const fam of familyIndex.list || []) {
      let score = 0;
      if (itemNorm.includes(fam.key) && fam.key.length >= 3) score += 40 + fam.key.length;
      else if (fam.key.includes(itemNorm) && itemNorm.length >= 3) score += 20 + itemNorm.length;
      if (itemSig.length) {
        const sigHits = itemSig.filter((tok) => fam.key.includes(tok)).length;
        score += sigHits * 8;
      } else if (itemTokens.length) {
        const tokenHits = itemTokens.filter((tok) => tok.length > 2 && fam.key.includes(tok)).length;
        score += tokenHits * 5;
      }
      if (score <= 0) continue;
      candidates.push({ fam, score });
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score || b.fam.key.length - a.fam.key.length);
    const top = candidates[0];
    if (!top || top.score < 8) return null;
    return top.fam;
  }

  function squareDrinkComparableTexts(drink) {
    if (!drink) return [];
    const out = new Set();
    const add = (value) => {
      const norm = normalizeSalesLookup(value);
      if (norm) out.add(norm);
    };
    add(drink?.name || "");
    add(drinkVariantListTitle(drink) || "");
    add(drinkVariantListTitleSimple(drink) || "");
    add(libraryListTitle(drink) || "");
    return Array.from(out);
  }

  function resolveSquareDrinkFromLibrary(itemName, modifiersText, familyIndex) {
    const itemNorm = normalizeSalesLookup(itemName);
    const modifierNorm = normalizeSalesLookup(modifiersText);
    const combinedNorm = [itemNorm, modifierNorm].filter(Boolean).join(" ").trim();
    const drinks = state.drinks.order.map((id) => state.drinks.byId[id]).filter(Boolean);
    if (!drinks.length) return null;

    const exactCandidates = drinks.filter((drink) => {
      const texts = squareDrinkComparableTexts(drink);
      return texts.some((t) => t && (t === itemNorm || (combinedNorm && t === combinedNorm)));
    });
    if (exactCandidates.length === 1) return exactCandidates[0];

    const family = findSquareSalesFamilyForItem(itemName, familyIndex);
    if (family) {
      const withinFamily = resolveSquareVariantInFamily(family, itemName, modifiersText);
      if (withinFamily) return withinFamily;
    }

    if (exactCandidates.length > 1) {
      const exactResolved = resolveSquareVariantInFamily(
        { drinkIds: exactCandidates.map((d) => d.id) },
        itemName,
        modifiersText
      );
      if (exactResolved) return exactResolved;
    }

    return resolveSquareVariantInFamily({ drinkIds: drinks.map((d) => d.id) }, itemName, modifiersText);
  }

  function resolveSquareVariantInFamily(family, itemName, modifiersText) {
    if (!family || !Array.isArray(family.drinkIds) || !family.drinkIds.length) return null;
    const itemNorm = normalizeSalesLookup(itemName);
    const modifierNorm = normalizeSalesLookup(modifiersText);
    const combinedNorm = [itemNorm, modifierNorm].filter(Boolean).join(" ").trim();
    const reqMilk = squareMilkKeyFromText(combinedNorm);
    const reqTemp = squareTempKeyFromText(combinedNorm);
    const reqSize = squareSizeTokenFromText(combinedNorm);

    const descriptors = family.drinkIds
      .map((id) => state.drinks.byId[id])
      .filter(Boolean)
      .map((drink) => ({
        drink,
        milkKey: squareMilkKeyFromText(detectMilkVariantName(drink) || ""),
        tempKey: normalizeSalesLookup(detectTempLabel(drink) || ""),
        sizeToken: normalizeSalesLookup(detectSizeToken(drink) || ""),
        flavorNorm: normalizeSalesLookup(detectFlavorVariantName(drink) || ""),
      }));
    if (!descriptors.length) return null;

    let reqFlavor = "";
    let reqFlavorScore = 0;
    const flavorNoise = new Set(["syrup", "sauce", "drizzle", "powder", "puree", "concentrate", "base"]);
    const flavorCandidates = Array.from(new Set(descriptors.map((d) => d.flavorNorm).filter(Boolean))).sort(
      (a, b) => b.length - a.length
    );
    for (const flavorNorm of flavorCandidates) {
      if (!combinedNorm) continue;
      let score = 0;
      if (combinedNorm.includes(flavorNorm)) {
        score = 100 + flavorNorm.length;
      } else {
        const tokens = flavorNorm.split(/\s+/g).filter((tok) => tok.length > 2 && !flavorNoise.has(tok));
        if (!tokens.length) continue;
        const hits = tokens.filter((tok) => combinedNorm.includes(tok)).length;
        if (!hits) continue;
        score = hits * 12 + tokens.length;
      }
      if (score > reqFlavorScore) {
        reqFlavorScore = score;
        reqFlavor = flavorNorm;
      }
    }

    let pool = descriptors.slice();
    const applyHardFilter = (predicate) => {
      const next = pool.filter(predicate);
      if (!next.length) return false;
      pool = next;
      return true;
    };

    if (reqMilk && !applyHardFilter((d) => d.milkKey === reqMilk)) return null;
    if (reqTemp && !applyHardFilter((d) => d.tempKey === reqTemp)) return null;
    if (reqSize && !applyHardFilter((d) => d.sizeToken === reqSize)) return null;
    if (reqFlavor && !applyHardFilter((d) => d.flavorNorm === reqFlavor)) return null;

    // Business defaults from POS behavior:
    // - no milk modifier => Whole Milk
    // - no temp modifier => Hot
    // - iced modifier => 16oz iced cup (if available)
    // - hot/default => 12oz hot cup (if available)
    const preferWholeMilk =
      !reqMilk && pool.some((d) => d.milkKey === "whole" || d.milkKey === "");
    if (preferWholeMilk) {
      const next = pool.filter((d) => d.milkKey === "whole" || d.milkKey === "");
      if (next.length) pool = next;
    }

    const preferredTemp = reqTemp || "hot";
    if (!reqTemp) {
      const next = pool.filter((d) => d.tempKey === preferredTemp);
      if (next.length) pool = next;
    }

    let preferredSize = reqSize;
    if (!preferredSize) {
      if (preferredTemp === "iced") preferredSize = "16oz";
      else if (preferredTemp === "hot" || !preferredTemp) preferredSize = "12oz";
    }
    if (!reqSize && preferredSize) {
      const next = pool.filter((d) => d.sizeToken === preferredSize);
      if (next.length) pool = next;
    }

    const scored = pool
      .map((d) => {
        let score = scoreSquareDrinkMatch(d.drink, itemNorm, modifierNorm);
        if (score < 0) return null;

        if (reqMilk) {
          if (d.milkKey === reqMilk) score += 45;
          else score -= 60;
        } else if (preferWholeMilk) {
          if (d.milkKey === "whole" || d.milkKey === "") score += 18;
          else score -= 8;
        }

        if (reqTemp) {
          if (d.tempKey === reqTemp) score += 24;
          else score -= 40;
        } else if (preferredTemp) {
          if (d.tempKey === preferredTemp) score += 10;
        }

        if (reqSize) {
          if (d.sizeToken === reqSize) score += 20;
          else if (d.sizeToken) score -= 28;
        } else if (preferredSize) {
          if (d.sizeToken === preferredSize) score += 12;
        }

        if (reqFlavor) {
          if (d.flavorNorm === reqFlavor) score += 30;
          else score -= 50;
        } else if (!d.flavorNorm) {
          score += 6;
        }
        return { ...d, score };
      })
      .filter(Boolean)
      .filter((d) => d.score >= 0)
      .sort((a, b) => b.score - a.score || String(a.drink.id).localeCompare(String(b.drink.id)));
    if (!scored.length) return null;

    const top = scored[0];
    if (top.score < 0) return null;
    return top.drink || null;
  }

  function squareVariantSearchText(drink) {
    return normalizeSalesLookup(
      [
        drink?.name || "",
        libraryListTitle(drink) || "",
        drinkVariantListTitle(drink) || "",
        drinkVariantListTitleSimple(drink) || "",
        detectMilkVariantName(drink) || "",
        detectFlavorVariantName(drink) || "",
        detectSizeToken(drink) || "",
        detectTempLabel(drink) || "",
      ].join(" ")
    );
  }

  function squareModifierPhrases(modifierNorm) {
    const out = [];
    if (/\boat milk\b/.test(modifierNorm)) out.push("oat milk");
    if (/\balmond milk\b/.test(modifierNorm)) out.push("almond milk");
    if (/\bwhole milk\b/.test(modifierNorm)) out.push("whole milk");
    if (/\bsoy milk\b/.test(modifierNorm)) out.push("soy milk");
    if (/\bcoconut milk\b/.test(modifierNorm)) out.push("coconut milk");
    return out;
  }

  function scoreSquareDrinkMatch(drink, itemNorm, modifierNorm) {
    const text = squareVariantSearchText(drink);
    if (!text) return -1;
    const combined = [itemNorm, modifierNorm].filter(Boolean).join(" ").trim();
    const signatureTokens = squareItemSignatureTokens(itemNorm);
    if (signatureTokens.length) {
      const signatureHits = signatureTokens.filter((tok) => text.includes(tok)).length;
      if (!signatureHits) return -1;
    } else if (itemNorm) {
      const itemTokens = normalizeSalesLookup(itemNorm).split(/\s+/g).filter(Boolean);
      const itemHits = itemTokens.filter((tok) => text.includes(tok)).length;
      if (!itemHits) return -1;
    }

    let score = 0;
    if (combined && text === combined) score += 120;
    if (itemNorm && text === itemNorm) score += 80;
    if (itemNorm && text.includes(itemNorm)) score += 35;
    if (combined && text.includes(combined)) score += 30;
    const tokens = squareModifierTokens(combined);
    for (const tok of tokens) {
      if (text.includes(tok)) score += 3;
    }
    const phrases = squareModifierPhrases(modifierNorm || "");
    for (const phrase of phrases) {
      if (text.includes(phrase)) score += 12;
    }
    const requestedMilk = squareMilkKeyFromText([itemNorm, modifierNorm].filter(Boolean).join(" "));
    if (requestedMilk) {
      const candidateMilk = squareMilkKeyFromText(detectMilkVariantName(drink) || "");
      if (candidateMilk === requestedMilk) score += 28;
      else if (candidateMilk) score -= 35;
    }
    if (modifierNorm) {
      const milkNorm = normalizeSalesLookup(detectMilkVariantName(drink) || "");
      if (milkNorm && modifierNorm.includes(milkNorm)) score += 18;
      const flavorNorm = normalizeSalesLookup(detectFlavorVariantName(drink) || "");
      if (flavorNorm && modifierNorm.includes(flavorNorm)) score += 14;
      const sizeNorm = normalizeSalesLookup(detectSizeToken(drink) || "");
      if (sizeNorm && modifierNorm.includes(sizeNorm)) score += 8;
      const tempNorm = normalizeSalesLookup(detectTempLabel(drink) || "");
      if (tempNorm && modifierNorm.includes(tempNorm)) score += 8;
    }
    const combinedNorm = combined;
    const candidateFlavorNorm = normalizeSalesLookup(detectFlavorVariantName(drink) || "");
    if (candidateFlavorNorm) {
      if (combinedNorm.includes(candidateFlavorNorm)) score += 10;
      else if (modifierNorm) {
        const flavorTokens = candidateFlavorNorm.split(/\s+/g).filter((tok) => tok.length > 2);
        const modifierFlavorHit = flavorTokens.some((tok) => modifierNorm.includes(tok));
        if (modifierFlavorHit) score += 6;
        else score -= 14;
      }
    }
    return score;
  }

  function regexEscape(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function expandModifierAliasForms(aliasNorm) {
    const base = normalizeSalesLookup(aliasNorm);
    if (!base) return [];
    const tokens = base.split(/\s+/g).filter(Boolean);
    if (!tokens.length) return [];
    const variants = new Set([tokens.join(" ")]);
    const lastIdx = tokens.length - 1;
    const last = tokens[lastIdx];
    const withLast = (nextLast) => {
      const value = String(nextLast || "").trim();
      if (!value) return;
      const copy = tokens.slice();
      copy[lastIdx] = value;
      variants.add(copy.join(" "));
    };
    if (last.endsWith("ies") && last.length > 3) withLast(`${last.slice(0, -3)}y`);
    if (last.endsWith("s") && last.length > 1) withLast(last.slice(0, -1));
    if (!last.endsWith("s")) withLast(`${last}s`);
    if (last.endsWith("y") && last.length > 1) withLast(`${last.slice(0, -1)}ies`);
    return Array.from(variants);
  }

  function aliasPatternForRegex(aliasNorm) {
    return regexEscape(aliasNorm).replace(/\s+/g, "\\s+");
  }

  function countAliasOccurrences(textNorm, aliasNorm) {
    const forms = expandModifierAliasForms(aliasNorm);
    if (!forms.length) return 0;
    let maxCount = 0;
    for (const form of forms) {
      const pattern = aliasPatternForRegex(form);
      const re = new RegExp(`(?:^|\\b)${pattern}(?=\\b|$)`, "gi");
      let count = 0;
      while (re.exec(textNorm)) {
        count += 1;
      }
      if (count > maxCount) maxCount = count;
    }
    return maxCount;
  }

  function aliasAppearsInModifierText(textNorm, aliasNorm) {
    return countAliasOccurrences(textNorm, aliasNorm) > 0;
  }

  function detectModifierQtyFromText(textNorm, aliasNorm, fallbackQty) {
    const forms = expandModifierAliasForms(aliasNorm);
    let parsedQty = null;
    for (const form of forms) {
      const aliasPattern = aliasPatternForRegex(form);
      const patterns = [
        new RegExp(`${aliasPattern}\\s*(?:x|qty|quantity|\\*)\\s*(\\d+(?:\\.\\d+)?)`, "i"),
        new RegExp(`(?:x|qty|quantity|\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*${aliasPattern}`, "i"),
        new RegExp(`(?:add|extra|plus)\\s*(\\d+(?:\\.\\d+)?)\\s*${aliasPattern}`, "i"),
        new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x\\s*)?(?:extra\\s+)?${aliasPattern}`, "i"),
        new RegExp(`${aliasPattern}\\s*(\\d+(?:\\.\\d+)?)`, "i"),
      ];
      for (const re of patterns) {
        const m = textNorm.match(re);
        if (!m) continue;
        const n = Number(m[1]);
        if (!Number.isFinite(n) || n <= 0) continue;
        if (parsedQty == null || n > parsedQty) parsedQty = n;
      }
    }
    if (parsedQty != null) return parsedQty;
    const aliasHits = countAliasOccurrences(textNorm, aliasNorm);
    if (aliasHits > 1) return Math.max(fallbackQty, aliasHits);
    return fallbackQty;
  }

  function analyzeModifierOverlay(modifiersText) {
    const textNorm = normalizeSalesLookup(modifiersText);
    if (!textNorm) {
      return {
        applied: [],
        label: "",
        lookupText: "",
        signature: "",
        unitCostDeltaMills: 0,
        unitPriceDeltaMills: 0,
      };
    }
    const matches = [];
    for (const mod of activeModifiers()) {
      const aliases = modifierAliasList(mod).sort((a, b) => b.length - a.length);
      if (!aliases.length) continue;
      let matchedAlias = "";
      for (const alias of aliases) {
        if (!aliasAppearsInModifierText(textNorm, alias)) continue;
        matchedAlias = alias;
        break;
      }
      if (!matchedAlias) continue;
      const fallbackQty = Number(mod.defaultQty || 1) > 0 ? Number(mod.defaultQty || 1) : 1;
      const qty = detectModifierQtyFromText(textNorm, matchedAlias, fallbackQty);
      matches.push({
        id: mod.id,
        name: mod.name || "Modifier",
        qty,
        costDeltaMills: Number(mod.costDeltaMills || 0),
        priceDeltaMills: Number(mod.priceDeltaMills || 0),
      });
    }
    if (!matches.length) {
      return {
        applied: [],
        label: "",
        lookupText: "",
        signature: "",
        unitCostDeltaMills: 0,
        unitPriceDeltaMills: 0,
      };
    }
    matches.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const label = matches
      .map((m) => `${m.name}${m.qty !== 1 ? ` x${trimZeros(m.qty)}` : ""}`)
      .join(", ");
    const lookupText = matches.map((m) => m.name).join(" ");
    const signature = matches.map((m) => `${m.id}:${trimZeros(m.qty)}`).join("|");
    const unitCostDeltaMills = matches.reduce((sum, m) => sum + Math.round(Number(m.qty || 0) * Number(m.costDeltaMills || 0)), 0);
    const unitPriceDeltaMills = matches.reduce(
      (sum, m) => sum + Math.round(Number(m.qty || 0) * Number(m.priceDeltaMills || 0)),
      0
    );
    return { applied: matches, label, lookupText, signature, unitCostDeltaMills, unitPriceDeltaMills };
  }

  function buildModifierOverlayFromApplied(appliedRows, ignoredRows = []) {
    const applied = Array.isArray(appliedRows) ? appliedRows.slice() : [];
    const ignored = Array.isArray(ignoredRows) ? ignoredRows.slice() : [];
    applied.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    ignored.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    const label = applied
      .map((m) => `${m.name}${m.qty !== 1 ? ` x${trimZeros(m.qty)}` : ""}`)
      .join(", ");
    const lookupText = applied.map((m) => m.name).join(" ");
    const signature = applied.map((m) => `${m.id}:${trimZeros(m.qty)}`).join("|");
    const unitCostDeltaMills = applied.reduce((sum, m) => sum + Math.round(Number(m.qty || 0) * Number(m.costDeltaMills || 0)), 0);
    const unitPriceDeltaMills = applied.reduce(
      (sum, m) => sum + Math.round(Number(m.qty || 0) * Number(m.priceDeltaMills || 0)),
      0
    );
    const ignoredLabel = ignored
      .map((m) => `${m.name}${m.qty !== 1 ? ` x${trimZeros(m.qty)}` : ""}`)
      .join(", ");
    return {
      applied,
      ignored,
      label,
      ignoredLabel,
      lookupText,
      signature,
      unitCostDeltaMills,
      unitPriceDeltaMills,
    };
  }

  function reconcileModifierOverlayForDrink(overlay, drink) {
    const base = overlay && typeof overlay === "object"
      ? overlay
      : { applied: [], label: "", lookupText: "", signature: "", unitCostDeltaMills: 0, unitPriceDeltaMills: 0 };
    const applied = Array.isArray(base.applied) ? base.applied : [];
    if (!drink || !applied.length) {
      return buildModifierOverlayFromApplied(applied, []);
    }
    const variantText = squareVariantSearchText(drink);
    if (!variantText) return buildModifierOverlayFromApplied(applied, []);

    const kept = [];
    const ignored = [];
    for (const row of applied) {
      const mod = state.modifiers?.byId?.[String(row?.id || "")];
      if (!mod) {
        kept.push(row);
        continue;
      }
      const aliases = modifierAliasList(mod);
      const appearsInVariant = aliases.some((alias) => alias && variantText.includes(alias));
      if (appearsInVariant) ignored.push(row);
      else kept.push(row);
    }
    return buildModifierOverlayFromApplied(kept, ignored);
  }

  async function importSquareSalesCsvFile() {
    const file = els.fileImportSquareCsv?.files?.[0];
    if (els.fileImportSquareCsv) els.fileImportSquareCsv.value = "";
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      toast("Couldn't read CSV file.");
      return;
    }
    const rows = parseCsvRows(text);
    if (!rows.length || rows.length < 2) {
      toast("CSV looks empty.");
      return;
    }
    const headers = rows[0] || [];
    const { itemIndex, qtyIndex, modifierIndexes } = findSquareItemAndQtyColumns(headers);
    if (itemIndex < 0 || qtyIndex < 0) {
      toast("Couldn't find item/quantity columns in CSV.");
      return;
    }
    const familyIndex = buildSquareSalesFamilyIndex();
    const matchedByEntryKey = {};
    const unmatchedByName = {};
    let processedLines = 0;
    let totalQty = 0;
    let totalRevenueMills = 0;
    let totalCostMills = 0;
    let totalProfitMills = 0;
    let totalModifierRevenueMills = 0;
    let totalModifierCostMills = 0;
    let matchedQty = 0;
    let unmatchedQty = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const itemName = String(row[itemIndex] || "").trim();
      if (!itemName) continue;
      const qtyRaw = String(row[qtyIndex] || "").trim();
      const qtyClean = qtyRaw.replace(/[^0-9.\-]/g, "");
      const qty = Number(qtyClean);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const modifiersText = extractModifierTextFromRow(row, modifierIndexes);
      const rawModifierOverlay = analyzeModifierOverlay(modifiersText);
      processedLines += 1;
      totalQty += qty;

      let drink = resolveSquareDrinkFromLibrary(itemName, modifiersText, familyIndex);
      if (!drink && rawModifierOverlay.lookupText) {
        const aliasModifierText = [modifiersText, rawModifierOverlay.lookupText].filter(Boolean).join(" | ");
        drink = resolveSquareDrinkFromLibrary(itemName, aliasModifierText, familyIndex);
      }
      const modifierOverlay = rawModifierOverlay;
      if (!drink) {
        const key = `${normalizeSalesLookup(itemName) || itemName}||${normalizeSalesLookup(modifiersText)}`;
        if (!unmatchedByName[key]) {
          unmatchedByName[key] = {
            itemName,
            modifiersText,
            catalogModifiersText: rawModifierOverlay.label || "",
            qty: 0,
            grossSalesMills: null,
          };
        }
        unmatchedByName[key].qty += qty;
        unmatchedQty += qty;
        continue;
      }

      const c = computeDrink(drink);
      const matchedTitle = drinkVariantListTitle(drink) || libraryListTitle(drink) || drink.name || "Drink";
      const baseUnitGrossMills = Number(
        state?.settings?.taxMode === "inclusive" ? c.consumerPriceMills : c.sellPriceMills
      ) || 0;
      const baseUnitCostMills = Number(c.totalCostMills || 0);
      const unitModifierPriceMills = Math.max(0, Number(modifierOverlay.unitPriceDeltaMills || 0));
      const unitModifierCostMills = Math.max(0, Number(modifierOverlay.unitCostDeltaMills || 0));
      const unitGrossMills = Math.max(0, baseUnitGrossMills + unitModifierPriceMills);
      const unitCostMills = Math.max(0, baseUnitCostMills + unitModifierCostMills);
      const entryKey = `${normalizeSalesLookup(itemName) || itemName}||${normalizeSalesLookup(modifiersText)}||${
        modifierOverlay.signature || ""
      }||${drink.id}`;
      if (!matchedByEntryKey[entryKey]) {
        matchedByEntryKey[entryKey] = {
          drinkId: drink.id,
          itemName,
          modifiersText,
          catalogModifiersText: rawModifierOverlay.label || "",
          matchedTitle,
          qty: 0,
          unitCostMills,
          unitGrossMills,
          unitModifierPriceMills,
          unitModifierCostMills,
          grossSalesMills: 0,
          costMills: 0,
          profitMills: 0,
          modifierPriceMills: 0,
          modifierCostMills: 0,
        };
      }
      const rec = matchedByEntryKey[entryKey];
      rec.qty += qty;
      const grossMills = Math.round(qty * rec.unitGrossMills);
      const costMills = Math.round(qty * rec.unitCostMills);
      const modifierRevenueMills = Math.round(qty * Number(rec.unitModifierPriceMills || 0));
      const modifierCostMills = Math.round(qty * Number(rec.unitModifierCostMills || 0));
      rec.grossSalesMills += grossMills;
      rec.costMills += costMills;
      rec.profitMills += grossMills - costMills;
      rec.modifierPriceMills += modifierRevenueMills;
      rec.modifierCostMills += modifierCostMills;
      matchedQty += qty;
      totalRevenueMills += grossMills;
      totalCostMills += costMills;
      totalProfitMills += grossMills - costMills;
      totalModifierRevenueMills += modifierRevenueMills;
      totalModifierCostMills += modifierCostMills;
    }

    const matched = Object.values(matchedByEntryKey).sort(
      (a, b) =>
        b.qty - a.qty ||
        String(a.matchedTitle || a.itemName || "").localeCompare(String(b.matchedTitle || b.itemName || ""))
    );
    const unmatched = Object.values(unmatchedByName).sort((a, b) => b.qty - a.qty || a.itemName.localeCompare(b.itemName));
    state.ui.squareSalesReport = {
      importedAtIso: new Date().toISOString(),
      fileName: String(file.name || ""),
      itemColumn: String(headers[itemIndex] || ""),
      qtyColumn: String(headers[qtyIndex] || ""),
      modifierColumns: (modifierIndexes || []).map((idx) => String(headers[idx] || "")).filter(Boolean),
      processedLines,
      totals: {
        totalQty,
        matchedQty,
        unmatchedQty,
        totalRevenueMills,
        totalCostMills,
        totalProfitMills,
        totalModifierRevenueMills,
        totalModifierCostMills,
      },
      matched,
      unmatched,
    };
    persistAndRender();
    const unmatchedCount = unmatched.length;
    toast(
      `Square sales imported. ${matched.length} matched drink(s), ${unmatchedCount} unmatched item(s).`
    );
  }

  function renderSquareSalesReport() {
    if (!els.squareSalesStatus || !els.squareSalesSummary || !els.squareSalesMatchedWrap || !els.squareSalesUnmatchedWrap) return;
    const report = state?.ui?.squareSalesReport;
    if (!report) {
      els.squareSalesStatus.textContent = "No Square sales CSV imported yet.";
      els.squareSalesSummary.innerHTML = "";
      els.squareSalesMatchedWrap.innerHTML = "";
      els.squareSalesUnmatchedWrap.innerHTML = "";
      return;
    }
    const importedAt = report.importedAtIso ? new Date(report.importedAtIso) : null;
    const importedText = importedAt && !Number.isNaN(importedAt.getTime()) ? importedAt.toLocaleString() : "Unknown time";
    const modifierCols = Array.isArray(report.modifierColumns) ? report.modifierColumns.filter(Boolean) : [];
    const modifierMeta = modifierCols.length ? `, Modifiers: ${modifierCols.join(" / ")}` : "";
    els.squareSalesStatus.textContent = `Imported ${report.fileName || "CSV"} on ${importedText} (Item: ${
      report.itemColumn || "?"
    }, Qty: ${report.qtyColumn || "?"}${modifierMeta}). Gross sales and costs include matched modifier overlays from Modifiers when detected.`;

    const totals = report.totals || {};
    els.squareSalesSummary.innerHTML = `
      <div class="sales-report-grid">
        <div class="sales-report-card"><div class="sales-report-k">Lines processed</div><div class="sales-report-v mono">${trimZeros(
          Number(report.processedLines || 0)
        )}</div></div>
        <div class="sales-report-card"><div class="sales-report-k">Quantity sold</div><div class="sales-report-v mono">${trimZeros(
          Number(totals.totalQty || 0)
        )}</div></div>
        <div class="sales-report-card"><div class="sales-report-k">Gross sales (library)</div><div class="sales-report-v mono">${formatMoney(
          Number(totals.totalRevenueMills || 0)
        )}</div></div>
        <div class="sales-report-card"><div class="sales-report-k">Estimated cost</div><div class="sales-report-v mono">${formatMoney(
          Number(totals.totalCostMills || 0)
        )}</div></div>
        <div class="sales-report-card"><div class="sales-report-k">Estimated profit</div><div class="sales-report-v mono">${formatMoney(
          Number(totals.totalProfitMills || 0)
        )}</div></div>
        <div class="sales-report-card"><div class="sales-report-k">Unmatched items</div><div class="sales-report-v mono">${trimZeros(
          Number((report.unmatched || []).length)
        )}</div></div>
      </div>
    `;

    if (!state.ui.squareSalesCollapsed || typeof state.ui.squareSalesCollapsed !== "object") {
      state.ui.squareSalesCollapsed = { matched: false, unmatched: false };
    }
    const matchedCollapsed = !!state.ui.squareSalesCollapsed.matched;
    const unmatchedCollapsed = !!state.ui.squareSalesCollapsed.unmatched;
    const matched = Array.isArray(report.matched) ? report.matched : [];
    const matchedBody = !matched.length
      ? `<div class="muted small">No drinks from this CSV matched your saved library.</div>`
      : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Matched library variant</th>
                  <th class="right">Qty</th>
                  <th>CSV item</th>
                  <th>Modifiers applied</th>
                  <th class="right">Gross sales</th>
                  <th class="right">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${matched
                  .map((r) => {
                    const matchedDrink = r?.drinkId ? state.drinks.byId[r.drinkId] : null;
                    const matchedVariantRaw = matchedDrink
                      ? drinkVariantListTitle(matchedDrink) || matchedDrink.name || "Drink"
                      : r.matchedTitle || r.title || "Drink";
                    const matchedVariant = String(matchedVariantRaw || "Drink").replace(
                      /\b(\d+(?:\.\d+)?)oz\b/gi,
                      "$1 oz"
                    );
                    return `
                  <tr>
                    <td>${escapeHtml(matchedVariant)}</td>
                    <td class="right mono">${trimZeros(Number(r.qty || 0))}</td>
                    <td>${escapeHtml(r.itemName || "—")}</td>
                    <td>${escapeHtml(r.modifiersText || "—")}</td>
                    <td class="right mono">${formatMoney(Number(r.grossSalesMills == null ? (r.revenueMills || 0) : r.grossSalesMills))}</td>
                    <td class="right mono">${formatMoney(Number(r.costMills || 0))}</td>
                  </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
    els.squareSalesMatchedWrap.innerHTML = `
      <div class="sales-report-wrap">
        <div class="sales-report-head">
          <h4>Matched Items</h4>
          <button class="btn small" type="button" data-square-section="matched">${matchedCollapsed ? "Expand" : "Collapse"}</button>
        </div>
        ${matchedCollapsed ? `<div class="muted small">Matched items are collapsed.</div>` : matchedBody}
      </div>
    `;

    const unmatched = Array.isArray(report.unmatched) ? report.unmatched : [];
    if (!unmatched.length) {
      els.squareSalesUnmatchedWrap.innerHTML = "";
      return;
    }
    els.squareSalesUnmatchedWrap.innerHTML = `
      <div class="sales-report-wrap">
        <div class="sales-report-head">
          <h4>Items Not Able To Be Calculated</h4>
          <button class="btn small" type="button" data-square-section="unmatched">${unmatchedCollapsed ? "Expand" : "Collapse"}</button>
        </div>
        ${
          unmatchedCollapsed
            ? `<div class="muted small">Unmatched items are collapsed.</div>`
            : `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th class="right">Qty</th>
                      <th>Modifiers applied</th>
                      <th class="right">Gross sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${unmatched
                      .map(
                        (r) => `
                      <tr>
                        <td>${escapeHtml(r.itemName || "Unknown")}</td>
                        <td class="right mono">${trimZeros(Number(r.qty || 0))}</td>
                        <td>${escapeHtml(r.modifiersText || "—")}</td>
                        <td class="right mono">—</td>
                      </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
        }
      </div>
    `;
  }

  function syncAiCsvDraftFromUI() {
    if (!state.ui || typeof state.ui !== "object") return;
    if (!state.ui.aiCsvDraft || typeof state.ui.aiCsvDraft !== "object") {
      state.ui.aiCsvDraft = deepClone(DEFAULT_STATE.ui.aiCsvDraft);
    }
    state.ui.aiCsvDraft.includeRaw = !!els.aiCsvIncludeRaw?.checked;
  }

  function syncAiCsvDraftUI() {
    if (!state.ui.aiCsvDraft || typeof state.ui.aiCsvDraft !== "object") {
      state.ui.aiCsvDraft = deepClone(DEFAULT_STATE.ui.aiCsvDraft);
    }
    if (els.aiCsvApiKey && !els.aiCsvApiKey.dataset.seeded && GEMINI_API_KEY) {
      els.aiCsvApiKey.value = GEMINI_API_KEY;
      els.aiCsvApiKey.dataset.seeded = "1";
    }
    if (els.aiCsvIncludeRaw) els.aiCsvIncludeRaw.checked = !!state.ui.aiCsvDraft.includeRaw;
  }

  function formatIsoDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function normalizeAiJsonText(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) return fenced[1].trim();
    return raw;
  }

  function parseAiJsonResponse(text) {
    const normalized = normalizeAiJsonText(text);
    if (!normalized) return null;
    try {
      return JSON.parse(normalized);
    } catch {}
    const objMatch = normalized.match(/\{[\s\S]*\}/);
    if (objMatch && objMatch[0]) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {}
    }
    return null;
  }

  function buildCsvAiPrompt(headers, sampleRows) {
    const safeHeaders = Array.isArray(headers) ? headers.map((v) => String(v || "")) : [];
    const safeRows = Array.isArray(sampleRows) ? sampleRows.map((row) => (Array.isArray(row) ? row.map((v) => String(v || "")) : [])) : [];
    return [
      "You are analyzing a sales CSV.",
      "Detect which columns represent:",
      "1) item name",
      "2) quantity sold",
      "3) any modifier/variation/options fields",
      "",
      "Return ONLY valid JSON with this exact shape:",
      '{',
      '  "detected_columns": {',
      '    "item": "column header name",',
      '    "quantity": "column header name",',
      '    "modifiers": ["column1", "column2"]',
      "  }",
      "}",
      "",
      "Rules:",
      "- Use header names exactly as they appear in the CSV header.",
      "- If no modifier column exists, return modifiers as an empty array.",
      "- Do not include markdown or explanations.",
      "",
      `CSV headers: ${JSON.stringify(safeHeaders)}`,
      `CSV sample rows: ${JSON.stringify(safeRows)}`,
    ].join("\n");
  }

  function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function detectCsvColumnsWithGemini(apiKey, headers, sampleRows, onRetry = null) {
    const prompt = buildCsvAiPrompt(headers, sampleRows);
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };
    const retryDelaysMs = [1500, 3000, 5000, 8000];
    const modelCandidates = Array.from(new Set([GEMINI_MODEL, ...GEMINI_MODEL_FALLBACKS].filter(Boolean)));
    let lastError = null;

    for (let modelIndex = 0; modelIndex < modelCandidates.length; modelIndex += 1) {
      const model = modelCandidates[modelIndex];
      const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const rawText = await response.text();
        let parsed = {};
        try {
          parsed = rawText ? JSON.parse(rawText) : {};
        } catch {
          parsed = { raw: rawText };
        }

        if (response.ok) {
          const aiText = Array.isArray(parsed?.candidates?.[0]?.content?.parts)
            ? parsed.candidates[0].content.parts.map((part) => String(part?.text || "")).join("\n")
            : "";
          const aiJson = parseAiJsonResponse(aiText);
          if (!aiJson || typeof aiJson !== "object") {
            lastError = new Error(`Gemini response from ${model} was not valid JSON.`);
            break;
          }
          return { aiJson, rawResponse: parsed, usedModel: model };
        }

        const detail = parsed?.error?.message || parsed?.message || rawText || `HTTP ${response.status}`;
        lastError = new Error(`Gemini request failed (${response.status}): ${detail}`);
        const isRetryable = response.status === 503 || response.status === 429;
        const hasAttemptLeft = attempt < retryDelaysMs.length;
        if (!isRetryable || !hasAttemptLeft) {
          if (!isRetryable) throw lastError;
          break;
        }
        const retryAfterHeader = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
          ? Math.round(retryAfterHeader * 1000)
          : retryDelaysMs[attempt];
        if (typeof onRetry === "function") {
          onRetry({
            attempt: attempt + 1,
            maxAttempts: retryDelaysMs.length + 1,
            status: response.status,
            delayMs: delay,
            model,
            modelIndex: modelIndex + 1,
            totalModels: modelCandidates.length,
          });
        }
        await waitMs(delay);
      }
    }

    if (lastError) throw lastError;
    throw new Error("Gemini request failed.");
  }

  function resolveDetectedColumnIndexes(headers, aiJson) {
    const detected = aiJson?.detected_columns && typeof aiJson.detected_columns === "object" ? aiJson.detected_columns : {};
    const itemKey = normalizeCsvHeaderKey(detected.item || "");
    const qtyKey = normalizeCsvHeaderKey(detected.quantity || "");
    const modifierKeys = Array.isArray(detected.modifiers)
      ? detected.modifiers.map((v) => normalizeCsvHeaderKey(v)).filter(Boolean)
      : [];

    const indexByKey = new Map();
    (headers || []).forEach((header, idx) => {
      indexByKey.set(normalizeCsvHeaderKey(header), idx);
    });

    let itemIndex = itemKey ? Number(indexByKey.get(itemKey)) : -1;
    let qtyIndex = qtyKey ? Number(indexByKey.get(qtyKey)) : -1;
    let modifierIndexes = modifierKeys
      .map((key) => Number(indexByKey.get(key)))
      .filter((idx) => Number.isInteger(idx) && idx >= 0);

    if (!(itemIndex >= 0 && qtyIndex >= 0)) {
      const fallback = findSquareItemAndQtyColumns(headers);
      if (!(itemIndex >= 0)) itemIndex = fallback.itemIndex;
      if (!(qtyIndex >= 0)) qtyIndex = fallback.qtyIndex;
      if (!modifierIndexes.length) modifierIndexes = fallback.modifierIndexes || [];
    }
    return { itemIndex, qtyIndex, modifierIndexes };
  }

  function buildFallbackDetectedColumns(headers) {
    const fallback = findSquareItemAndQtyColumns(headers);
    const itemHeader = fallback.itemIndex >= 0 ? String(headers[fallback.itemIndex] || "") : "";
    const qtyHeader = fallback.qtyIndex >= 0 ? String(headers[fallback.qtyIndex] || "") : "";
    const modifierHeaders = (fallback.modifierIndexes || [])
      .map((idx) => String(headers[idx] || "").trim())
      .filter(Boolean);
    return {
      ok: fallback.itemIndex >= 0 && fallback.qtyIndex >= 0,
      aiJson: {
        detected_columns: {
          item: itemHeader,
          quantity: qtyHeader,
          modifiers: modifierHeaders,
        },
      },
    };
  }

  function parseCsvQuantity(value) {
    const text = String(value == null ? "" : value).trim();
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.\-]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  function extractModifierTextFromRow(row, modifierIndexes) {
    const out = [];
    const seen = new Set();
    for (const idx of Array.isArray(modifierIndexes) ? modifierIndexes : []) {
      const raw = String(row?.[idx] || "").trim();
      if (!raw) continue;
      const key = normalizeSalesLookup(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(raw);
    }
    return out.join(" | ");
  }

  function buildAiCsvRows(rows, indexes) {
    const itemIndex = Number(indexes?.itemIndex);
    const qtyIndex = Number(indexes?.qtyIndex);
    const modifierIndexes = Array.isArray(indexes?.modifierIndexes) ? indexes.modifierIndexes : [];
    if (!(itemIndex >= 0) || !(qtyIndex >= 0)) return [];
    const out = [];
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const itemName = String(row[itemIndex] || "").trim();
      if (!itemName) continue;
      const qty = parseCsvQuantity(row[qtyIndex]);
      if (!(qty > 0)) continue;
      const modifiersText = extractModifierTextFromRow(row, modifierIndexes);
      out.push({
        itemName,
        qty,
        modifiersText,
        csvLineNumber: i + 1,
      });
    }
    return out;
  }

  function formatCsvLineNumberList(lines) {
    const nums = Array.isArray(lines)
      ? Array.from(new Set(lines.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0))).sort((a, b) => a - b)
      : [];
    if (!nums.length) return "—";
    const maxVisible = 10;
    if (nums.length <= maxVisible) return nums.join(", ");
    const shown = nums.slice(0, maxVisible).join(", ");
    return `${shown} (+${nums.length - maxVisible} more)`;
  }

  function matchAiCsvRowsToLibrary(aiRows) {
    const familyIndex = buildSquareSalesFamilyIndex();
    const byKey = {};
    let totalQty = 0;
    let matchedQty = 0;
    let matchedRows = 0;
    let unmatchedRows = 0;
    let matchedRevenueMills = 0;
    let matchedCostMills = 0;
    let matchedProfitMills = 0;
    let matchedModifierRevenueMills = 0;
    let matchedModifierCostMills = 0;

    for (const entry of aiRows || []) {
      const itemName = String(entry?.itemName || "").trim();
      const modifiersText = String(entry?.modifiersText || "").trim();
      const qty = Number(entry?.qty || 0);
      const csvLineNumber = Number(entry?.csvLineNumber || 0);
      if (!itemName || !(qty > 0)) continue;
      totalQty += qty;

      const rawModifierOverlay = analyzeModifierOverlay(modifiersText);
      let drink = resolveSquareDrinkFromLibrary(itemName, modifiersText, familyIndex);
      if (!drink && rawModifierOverlay.lookupText) {
        const aliasModifierText = [modifiersText, rawModifierOverlay.lookupText].filter(Boolean).join(" | ");
        drink = resolveSquareDrinkFromLibrary(itemName, aliasModifierText, familyIndex);
      }
      const modifierOverlay = rawModifierOverlay;
      const matchedTitle = drink
        ? drinkVariantListTitle(drink) || libraryListTitle(drink) || String(drink.name || "").trim() || "Drink"
        : "No match";
      const computed = drink ? computeDrink(drink) : null;
      const baseUnitRevenueMills = drink
        ? Number(state?.settings?.taxMode === "inclusive" ? computed?.consumerPriceMills : computed?.sellPriceMills) || 0
        : 0;
      const baseUnitCostMills = drink ? Number(computed?.totalCostMills || 0) : 0;
      const unitModifierPriceMills = Math.max(0, Number(modifierOverlay.unitPriceDeltaMills || 0));
      const unitModifierCostMills = Math.max(0, Number(modifierOverlay.unitCostDeltaMills || 0));
      const unitRevenueMills = Math.max(0, baseUnitRevenueMills + unitModifierPriceMills);
      const unitCostMills = Math.max(0, baseUnitCostMills + unitModifierCostMills);
      const revenueMills = Math.round(qty * unitRevenueMills);
      const costMills = Math.round(qty * unitCostMills);
      const profitMills = revenueMills - costMills;
      const modifierRevenueMills = Math.round(qty * unitModifierPriceMills);
      const modifierCostMills = Math.round(qty * unitModifierCostMills);

      if (drink) {
        matchedRows += 1;
        matchedQty += qty;
        matchedRevenueMills += revenueMills;
        matchedCostMills += costMills;
        matchedProfitMills += profitMills;
        matchedModifierRevenueMills += modifierRevenueMills;
        matchedModifierCostMills += modifierCostMills;
      } else {
        unmatchedRows += 1;
      }
      const key = `${normalizeSalesLookup(itemName)}||${normalizeSalesLookup(modifiersText)}||${
        modifierOverlay.signature || ""
      }||${drink?.id || "none"}`;
      if (!byKey[key]) {
        byKey[key] = {
          itemName,
          modifiersText,
          catalogModifiersText: rawModifierOverlay.label || "",
          qty: 0,
          drinkId: drink?.id || "",
          matchedTitle,
          isMatched: !!drink,
          lineNumbers: [],
          unitRevenueMills,
          unitCostMills,
          unitModifierPriceMills,
          unitModifierCostMills,
          revenueMills: 0,
          costMills: 0,
          profitMills: 0,
          modifierRevenueMills: 0,
          modifierCostMills: 0,
        };
      }
      byKey[key].qty += qty;
      byKey[key].revenueMills += revenueMills;
      byKey[key].costMills += costMills;
      byKey[key].profitMills += profitMills;
      byKey[key].modifierRevenueMills += modifierRevenueMills;
      byKey[key].modifierCostMills += modifierCostMills;
      if (csvLineNumber > 0) byKey[key].lineNumbers.push(csvLineNumber);
    }

    const rows = Object.values(byKey).sort(
      (a, b) =>
        Number(b.isMatched) - Number(a.isMatched) ||
        b.qty - a.qty ||
        String(a.itemName || "").localeCompare(String(b.itemName || ""))
    );
    rows.forEach((row) => {
      row.marginPct = row.revenueMills > 0 ? (row.profitMills / row.revenueMills) * 100 : null;
      row.lineNumbersText = formatCsvLineNumberList(row.lineNumbers);
    });
    const processedLines = aiRows.length;
    const matchedMarginPct = matchedRevenueMills > 0 ? (matchedProfitMills / matchedRevenueMills) * 100 : null;
    return {
      rows,
      cards: [
        { key: "CSV lines parsed", value: trimZeros(processedLines) },
        { key: "Total quantity", value: trimZeros(totalQty) },
        { key: "Matched lines", value: trimZeros(matchedRows) },
        { key: "Unmatched lines", value: trimZeros(unmatchedRows) },
        { key: "Matched quantity", value: trimZeros(matchedQty) },
        { key: "Unmatched quantity", value: trimZeros(totalQty - matchedQty) },
        { key: "Matched revenue", value: formatMoney(matchedRevenueMills) },
        { key: "Matched cost (actual)", value: formatMoney(matchedCostMills) },
        { key: "Matched profit", value: formatMoney(matchedProfitMills) },
        { key: "Matched margin", value: matchedMarginPct == null ? "—" : `${matchedMarginPct.toFixed(1)}%` },
      ],
    };
  }

  function renderAiCsvRows(report) {
    if (!els.aiCsvRows) return;
    const rows = Array.isArray(report?.rows) ? report.rows : [];
    if (!rows.length) {
      els.aiCsvRows.innerHTML = `<div class="muted small">No rows detected from this CSV.</div>`;
      return;
    }
    els.aiCsvRows.innerHTML = `
      <div class="sales-report-wrap">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CSV item</th>
                <th class="right">Qty</th>
                <th>Modifiers</th>
                <th>Matched library drink</th>
                <th class="right">Cost</th>
                <th class="right">Revenue</th>
                <th class="right">Profit</th>
                <th class="right">Margin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                <tr>
                  <td>${escapeHtml(row.itemName || "—")}</td>
                  <td class="right mono">${trimZeros(Number(row.qty || 0))}</td>
                  <td>${escapeHtml(row.modifiersText || "—")}</td>
                  <td>${escapeHtml(row.matchedTitle || "No match")}</td>
                  <td class="right mono">${row.isMatched ? formatMoney(Number(row.costMills || 0)) : "—"}</td>
                  <td class="right mono">${row.isMatched ? formatMoney(Number(row.revenueMills || 0)) : "—"}</td>
                  <td class="right mono">${row.isMatched ? formatMoney(Number(row.profitMills || 0)) : "—"}</td>
                  <td class="right mono">${row.isMatched && row.marginPct != null ? `${Number(row.marginPct).toFixed(1)}%` : "—"}</td>
                  <td class="mono">${row.isMatched ? "Matched" : "Unmatched"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderAiCsvMatcher() {
    if (!els.aiCsvStatus || !els.aiCsvSummary || !els.aiCsvRows || !els.aiCsvRaw) return;
    syncAiCsvDraftUI();
    const report = state?.ui?.aiCsvReport;
    if (!report || report.error) {
      els.aiCsvStatus.textContent = report?.error || "No CSV analyzed yet.";
      els.aiCsvSummary.innerHTML = "";
      els.aiCsvRows.innerHTML = "";
      els.aiCsvRaw.innerHTML = "";
      return;
    }

    const analyzedAt = formatIsoDateTime(report.analyzedAtIso);
    const fileName = report.fileName || "CSV";
    const detected = report.detectedColumns || {};
    const modifierText = Array.isArray(detected.modifiers) && detected.modifiers.length
      ? detected.modifiers.join(", ")
      : "None";
    const methodNote = report.detectionMethod === "fallback"
      ? ` AI unavailable, used local detection.${report.fallbackReason ? ` (${report.fallbackReason})` : ""}`
      : report.modelUsed
        ? ` Model: ${report.modelUsed}.`
        : "";
    els.aiCsvStatus.textContent = `Analyzed ${fileName} on ${analyzedAt}. Detected columns: item (${detected.item || "—"}), quantity (${detected.quantity || "—"}), modifiers (${modifierText}).${methodNote}`;

    const cards = Array.isArray(report.cards) ? report.cards : [];
    els.aiCsvSummary.innerHTML = cards.length
      ? `
      <div class="sales-report-grid">
        ${cards
          .map(
            (item) => `
          <div class="sales-report-card">
            <div class="sales-report-k">${escapeHtml(item.key || "")}</div>
            <div class="sales-report-v mono">${escapeHtml(item.value || "—")}</div>
          </div>`
          )
          .join("")}
      </div>`
      : "";

    renderAiCsvRows(report);
    if (state?.ui?.aiCsvDraft?.includeRaw && aiCsvLastRawResponse) {
      els.aiCsvRaw.innerHTML = `<pre class="square-api-raw">${escapeHtml(aiCsvLastRawResponse)}</pre>`;
    } else {
      els.aiCsvRaw.innerHTML = "";
    }
  }

  async function runAiCsvReport() {
    if (!els.btnRunAiCsvReport) return;
    const file = els.aiCsvUpload?.files?.[0];
    if (!file) {
      toast("Upload a CSV first.");
      return;
    }
    let csvText = "";
    try {
      csvText = await file.text();
    } catch {
      toast("Couldn't read CSV file.");
      return;
    }
    const rows = parseCsvRows(csvText);
    if (rows.length < 2) {
      toast("CSV looks empty.");
      return;
    }

    syncAiCsvDraftFromUI();
    const apiKey = String(els.aiCsvApiKey?.value || GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      toast("Enter a Gemini API key.");
      return;
    }
    const headers = rows[0] || [];
    const sampleRows = rows.slice(1, 151);

    els.btnRunAiCsvReport.disabled = true;
    if (els.aiCsvStatus) els.aiCsvStatus.textContent = "Analyzing CSV with AI...";
    els.aiCsvSummary.innerHTML = "";
    els.aiCsvRows.innerHTML = "";
    els.aiCsvRaw.innerHTML = "";

    try {
      let aiJson = null;
      let rawResponse = null;
      let usedModel = "";
      let usedFallback = false;
      let fallbackReason = "";

      try {
        const result = await detectCsvColumnsWithGemini(
          apiKey,
          headers,
          sampleRows,
          (retryState) => {
            if (!els.aiCsvStatus) return;
            const modelLabel = retryState?.model ? `${retryState.model}` : "Gemini";
            els.aiCsvStatus.textContent = `Gemini is busy (${retryState.status}) on ${modelLabel}. Retrying ${retryState.attempt}/${retryState.maxAttempts} in ${(retryState.delayMs / 1000).toFixed(1)}s...`;
          }
        );
        aiJson = result.aiJson;
        rawResponse = result.rawResponse;
        usedModel = String(result.usedModel || "");
      } catch (aiErr) {
        const fallback = buildFallbackDetectedColumns(headers);
        if (!fallback.ok) throw aiErr;
        usedFallback = true;
        fallbackReason =
          aiErr && typeof aiErr === "object" && "message" in aiErr
            ? String(aiErr.message || "AI unavailable")
            : "AI unavailable";
        aiJson = fallback.aiJson;
        rawResponse = {
          fallback: true,
          reason: fallbackReason,
          detected_columns: fallback.aiJson.detected_columns,
        };
        usedModel = "local-heuristic";
      }

      aiCsvLastRawResponse = JSON.stringify(rawResponse, null, 2);

      const indexes = resolveDetectedColumnIndexes(headers, aiJson);
      if (!(indexes.itemIndex >= 0) || !(indexes.qtyIndex >= 0)) {
        throw new Error("AI could not detect item and quantity columns from this CSV.");
      }

      const aiRows = buildAiCsvRows(rows, indexes);
      const matched = matchAiCsvRowsToLibrary(aiRows);
      const detectedColumns = aiJson?.detected_columns || {};
      state.ui.aiCsvReport = {
        analyzedAtIso: new Date().toISOString(),
        fileName: String(file.name || "CSV"),
        detectedColumns: {
          item: String(detectedColumns.item || headers[indexes.itemIndex] || ""),
          quantity: String(detectedColumns.quantity || headers[indexes.qtyIndex] || ""),
          modifiers: Array.isArray(detectedColumns.modifiers)
            ? detectedColumns.modifiers.map((v) => String(v || "").trim()).filter(Boolean)
            : (indexes.modifierIndexes || []).map((idx) => String(headers[idx] || "")).filter(Boolean),
        },
        detectionMethod: usedFallback ? "fallback" : "ai",
        modelUsed: usedModel,
        fallbackReason: usedFallback ? String(fallbackReason || "").slice(0, 220) : "",
        cards: matched.cards,
        rows: matched.rows,
      };
      saveStateDebounced();
      renderAiCsvMatcher();
      toast(usedFallback ? "CSV matched using fallback detection." : "CSV analyzed and matched.");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err ? String(err.message || "CSV analysis failed.") : "CSV analysis failed.";
      state.ui.aiCsvReport = { error: message };
      aiCsvLastRawResponse = "";
      saveStateDebounced();
      renderAiCsvMatcher();
      toast("AI CSV analysis failed.");
    } finally {
      els.btnRunAiCsvReport.disabled = false;
    }
  }

  async function importJSONFile() {
    const file = els.fileImport.files?.[0];
    els.fileImport.value = "";
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      toast("Import failed: couldn't read file.");
      return;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast("Import failed: invalid JSON.");
      return;
    }
    const next = migrateState(parsed);
    confirmDialog({
      title: "Import data?",
      body: "This will replace your current ingredients and drinks with the imported file.",
      okLabel: "Import",
      danger: true,
      onOk: () => {
        state = next;
        ensureDraftExists();
        syncCurrencyUI();
        persistAndRender();
        toast("Imported.");
      },
    });
  }

  function wipeAllData() {
    confirmDialog({
      title: "Wipe all data?",
      body: "This deletes all ingredients and saved drinks from this browser. Export first if you want a backup.",
      okLabel: "Wipe",
      danger: true,
      onOk: () => {
        state = deepClone(DEFAULT_STATE);
        ensureDraftExists();
        syncCurrencyUI();
        persistAndRender();
        toast("All data wiped.");
      },
    });
  }

  function seedSampleData() {
    confirmDialog({
      title: "Load sample data?",
      body: "Adds a few ingredients and a sample drink. You can delete them later.",
      okLabel: "Load samples",
      danger: false,
      onOk: () => {
        const samples = buildSampleData();
        for (const ing of samples.ingredients) {
          if (!state.ingredients.byId[ing.id]) {
            state.ingredients.byId[ing.id] = ing;
            state.ingredients.order.unshift(ing.id);
          }
        }
        for (const cup of samples.cups) {
          if (!state.cups.byId[cup.id]) {
            state.cups.byId[cup.id] = cup;
            state.cups.order.unshift(cup.id);
          }
        }
        for (const d of samples.drinks) {
          if (!state.drinks.byId[d.id]) {
            state.drinks.byId[d.id] = d;
            state.drinks.order.unshift(d.id);
          }
        }
        state.ui.selectedLibraryDrinkId = samples.drinks[0]?.id || null;
        persistAndRender();
        toast("Sample data loaded.");
      },
    });
  }

  function buildSampleData() {
    const now = new Date().toISOString();
    const ing = (o) => {
      const unitKey = o.unitKey || "g";
      return {
        archived: false,
        updatedAtIso: now,
        notes: "",
        purchaseAmountUnitKey: unitKey === "custom" ? "each" : unitKey,
        ...o,
      };
    };
    const mk = {
      lid12: ing({
        id: "ing_sample_lid12",
        name: "12oz lid",
        category: "Lid",
        unitKey: "each",
        unitLabel: "each",
        purchasePriceMills: dollarsToMills(7.5),
        purchaseAmount: 100,
      }),
      milk: ing({
        id: "ing_sample_milk",
        name: "Whole milk",
        category: "Milk",
        unitKey: "ml",
        unitLabel: "ml",
        purchasePriceMills: dollarsToMills(4.25),
        purchaseAmount: 3785,
        lossPct: 1,
      }),
      vanilla: ing({
        id: "ing_sample_vanilla",
        name: "Vanilla syrup",
        category: "Syrup",
        unitKey: "g",
        unitLabel: "g",
        purchasePriceMills: dollarsToMills(12.0),
        purchaseAmount: 1000,
        lossPct: 0,
      }),
      espresso: ing({
        id: "ing_sample_espresso",
        name: "Espresso shot",
        category: "Coffee",
        unitKey: "custom",
        unitLabel: "shot",
        purchasePriceMills: dollarsToMills(0.38),
        purchaseAmount: 1,
      }),
    };

    const cup12 = {
      id: "cup_sample_12oz_hot",
      name: "12oz hot cup",
      sizeLabel: "12oz hot",
      tempKey: "hot",
      purchasePriceMills: dollarsToMills(12.0),
      purchaseQtyEach: 100,
      notes: "",
      updatedAtIso: now,
    };

    const drink = {
      id: "drink_sample_vanilla_latte",
      name: "Vanilla Latte",
      category: "Latte",
      sizeLabel: "12oz hot",
      notes: "Example only. Replace quantities with your actual recipe weights/volumes.",
      container: { cupId: cup12.id },
      items: [
        { lineId: uid("line"), ingredientId: mk.lid12.id, qty: 1 },
        { lineId: uid("line"), ingredientId: mk.espresso.id, qty: 2 },
        { lineId: uid("line"), ingredientId: mk.milk.id, qty: 260 },
        { lineId: uid("line"), ingredientId: mk.vanilla.id, qty: 18 },
      ],
      extra: { salesTaxPct: 6 },
      pricing: { sellPriceMills: dollarsToMills(6.0), targetMarginPct: 70 },
      updatedAtIso: now,
    };

    return { ingredients: Object.values(mk), cups: [cup12], drinks: [drink] };
  }

  // ---------- Confirm / Toast ----------
  function confirmDialog({ title, body, okLabel, danger, onOk }) {
    els.confirmTitle.textContent = title || "Confirm";
    els.confirmBody.textContent = body || "";
    els.btnConfirmOk.textContent = okLabel || "Confirm";
    els.btnConfirmOk.classList.toggle("danger", !!danger);

    let cleaned = false;
    const cleanupOnce = () => {
      if (cleaned) return;
      cleaned = true;
      els.btnConfirmOk.removeEventListener("click", okHandler);
      els.btnConfirmCancel.removeEventListener("click", cancelHandler);
      els.btnCloseConfirm.removeEventListener("click", cancelHandler);
    };

    const okHandler = () => {
      cleanupOnce();
      els.modalConfirm.close();
      onOk?.();
    };
    const cancelHandler = () => {
      cleanupOnce();
      els.modalConfirm.close();
    };

    els.btnConfirmOk.addEventListener("click", okHandler);
    els.btnConfirmCancel.addEventListener("click", cancelHandler);
    els.btnCloseConfirm.addEventListener("click", cancelHandler);
    els.modalConfirm.addEventListener("close", cleanupOnce, { once: true });

    els.modalConfirm.showModal();
  }

  function toast(msg) {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  // ---------- Helpers ----------
  function uid(prefix) {
    const base =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}_${base}`;
  }

  function unitLabel(ing) {
    if (!ing) return "unit";
    if (ing.unitKey === "coffee_pricing") return ing.unitLabel || "shot";
    if (ing.unitKey === "custom") return ing.unitLabel || "unit";
    if (ing.unitKey === "oz") return "oz";
    if (ing.unitKey === "ml") return "ml";
    if (ing.unitKey === "each") return "each";
    return "g";
  }

  function purchaseUnitLabel(key) {
    switch (key) {
      case "g":
        return "g";
      case "oz":
        return "oz (wt)";
      case "floz":
        return "fl oz";
      case "ml":
        return "ml";
      case "l":
        return "l";
      case "quart":
        return "quart";
      case "half_gallon":
        return "half gal";
      case "gallon":
        return "gal";
      case "each":
        return "each";
      default:
        return String(key || "—");
    }
  }

  function parseDecimal(input) {
    const s = String(input ?? "").trim().replace(/,/g, "");
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function parseDecimalOrNull(input) {
    const s = String(input ?? "").trim().replace(/,/g, "");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseMoneyToMills(input) {
    const dollars = parseDecimal(input);
    return dollarsToMills(dollars);
  }

  function dollarsToMills(dollars) {
    if (!Number.isFinite(dollars)) return 0;
    return Math.round(dollars * 1000);
  }

  function millsToMoneyInput(mills) {
    const d = (Number(mills || 0) / 1000).toFixed(2);
    return d === "0.00" ? "" : d;
  }

  function currencySymbol(code) {
    try {
      const parts = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }).formatToParts(0);
      const part = parts.find((p) => p.type === "currency");
      return part?.value || "$";
    } catch {
      return "$";
    }
  }

  function normalizeCurrencyCode(code) {
    const s = String(code || "").trim().toUpperCase();
    return /^[A-Z]{3}$/.test(s) ? s : "USD";
  }

  function moneyFormatter(digits) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: normalizeCurrencyCode(state.meta.currency),
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
    }
  }

  function formatMoney(mills) {
    const dollars = Number(mills || 0) / 1000;
    return moneyFormatter(2).format(dollars);
  }

  function formatMoneyWithDigits(millsPerUnit, digits) {
    const dollars = Number(millsPerUnit || 0) / 1000;
    return moneyFormatter(digits).format(dollars);
  }

  function trimZeros(n) {
    if (!Number.isFinite(n)) return "0";
    const s = n.toFixed(4);
    return s.replace(/\.?0+$/, "");
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(s) {
    return escapeHtml(String(s ?? ""));
  }

  function updateMetaStatus() {
    const iso = state.meta.lastSavedAtIso;
    if (!iso) {
      els.metaStatus.textContent = "Local-only • Autosaves to this browser";
      return;
    }
    const t = new Date(iso);
    const time = Number.isFinite(t.getTime())
      ? t.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "—";
    els.metaStatus.textContent = `Local-only • Last saved ${time}`;
  }

  function deepClone(obj) {
    if (typeof structuredClone === "function") return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }

})();
