import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  Upload,
  Copy,
  Check,
  Boxes,
  Edit2,
  Search,
  Tv,
  KeyRound,
  Server,
  Layers,
  X,
  Ban,
  CheckCircle2,
  FolderPlus,
  Tag,
  Sparkles,
  Link2,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Dices,
} from 'lucide-react';
import { LuckyWheelAdminManager } from '../components/LuckyWheelAdminManager';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { DuplicateCodesModal, DuplicateCodeItem } from '../components/ui/DuplicateCodesModal';
import { ImageUploadInput } from '../components/ui/ImageUploadInput';
import { ProductGalleryUpload } from '../components/ui/ProductGalleryUpload';
import { QuickFomoAdjustModal } from '../components/ui/QuickFomoAdjustModal';
import { PackageManagerSection } from '../components/ui/PackageManagerSection';
import type { ProductPackageVariant } from '../../types/game';
import { groupUtilitiesByTheme, getProductPackages } from '../../utils/productPackageUtils';
import { adminDataService } from '../services/adminDataService';
import { marketingService } from '../../services/marketingService';
import { InventoryItem } from '../types/adminTypes';
import { UtilityProduct, UtilityCategory } from '../../types/game';
import { formatCore, formatCurrencyVND, smartVietnameseMatch } from '../../utils/textUtils';

interface UtilitiesModuleProps {
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const UtilitiesModule: React.FC<UtilitiesModuleProps> = ({ onShowToast }) => {
  const [utilities, setUtilities] = useState<UtilityProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortFilter, setSortFilter] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK'>('NEWEST');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'utilities' | 'wheel'>('utilities');

  // --- SHOW / HIDE VIRTUAL METRICS TOGGLE ---
  const [showVirtualStats, setShowVirtualStats] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_admin_show_virtual_stats') !== 'false';
  });

  const [showAdminSold, setShowAdminSold] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_admin_show_sold_util') !== 'false' && localStorage.getItem('wcg_utilities_global_show_sold') !== 'false';
  });

  const [showAdminStock, setShowAdminStock] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wcg_admin_show_stock_util') !== 'false';
  });

  // --- VIEW MODE: GROUPED (SẢN PHẨM ĐẠI DIỆN) VS FLAT (TẤT CẢ GÓI LẺ) ---
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>(() => {
    if (typeof window === 'undefined') return 'grouped';
    return (localStorage.getItem('wcg_admin_util_view_mode') as 'grouped' | 'flat') || 'grouped';
  });

  // --- QUICK FOMO ADJUST MODAL STATE ---
  const [fomoAdjustProduct, setFomoAdjustProduct] = useState<UtilityProduct | null>(null);

  // --- CATEGORIES MANAGEMENT STATE ---
  const [categoriesList, setCategoriesList] = useState<UtilityCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('✨');
  const [deletingCat, setDeletingCat] = useState<UtilityCategory | null>(null);

  // --- CREATE / EDIT PRODUCT MODAL STATE ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UtilityProduct | null>(null);
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'account',
    category_label: 'Tài khoản Premium',
    badge: 'HOT BÁN CHẠY',
    original_price: 100000,
    discount_percent: 0,
    current_price: 100000,
    stock_quantity: 0,
    show_sold_count: true,
    virtual_sold_count: 0,
    description: '',
    instructions: '',
    guide_links: [{ id: 'guide_1', text: 'Xem hướng dẫn chi tiết tại đây', url: '' }] as Array<{ id: string; text: string; url: string }>,
    guide_url: '',
    guide_text: 'Xem hướng dẫn chi tiết tại đây',
    show_guide_link: true,
    show_warranty: false,
    warranty_text: 'Bảo hành 1 đổi 1 suốt chu kỳ',
    cover_image_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
    product_images: ['https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80'] as string[],
    is_active: true,
  });

  // --- BATCH IMPORT MODAL STATE (NHẬP KHO) ---
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<UtilityProduct | null>(null);
  const [batchLines, setBatchLines] = useState('');
  const [batchPrice, setBatchPrice] = useState(80000);

  // --- DUPLICATE CODES WARNING MODAL STATE ---
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateItems, setDuplicateItems] = useState<DuplicateCodeItem[]>([]);
  const [pendingAllItems, setPendingAllItems] = useState<Array<Omit<InventoryItem, 'id' | 'createdAt'>>>([]);
  const [pendingUniqueItems, setPendingUniqueItems] = useState<Array<Omit<InventoryItem, 'id' | 'createdAt'>>>([]);

  // --- INVENTORY DETAILS MODAL STATE (KHO CHI TIẾT) ---
  const [detailProduct, setDetailProduct] = useState<UtilityProduct | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetailIds, setSelectedDetailIds] = useState<string[]>([]);
  const [isBulkDeleteDetailOpen, setIsBulkDeleteDetailOpen] = useState(false);

  // Delete Confirm Modal
  const [deletingProduct, setDeletingProduct] = useState<UtilityProduct | null>(null);
  const [deletingInventoryItem, setDeletingInventoryItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('wcg_admin_data_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('wcg_admin_data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const loadData = () => {
    const data = adminDataService.getUtilities();
    setUtilities(data);
    const inv = adminDataService.getInventory();
    setInventory(inv);
    const cats = adminDataService.getUtilityCategories();
    setCategoriesList(cats);
  };

  const handleCopy = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onShowToast('Đã sao chép mã / tài khoản', val, 'info');
  };

  const handleRandomizeVirtualSoldUnder10 = () => {
    const currentList = adminDataService.getUtilities();
    let updatedCount = 0;
    currentList.forEach((u) => {
      // Chỉ áp dụng cho các mục có số lượng bán thật < 10 (hoặc chưa đạt 32, ngoại trừ VIP 7D)
      const currentRealSold = Number(u.sold_count) || 0;
      if (currentRealSold < 10 && u.id !== 'ut_vs_05_vip_7d') {
        const randomSold = Math.floor(Math.random() * (212 - 32 + 1)) + 32;
        const updatedUtil: UtilityProduct = {
          ...u,
          virtual_sold_count: randomSold,
          show_sold_count: true,
          virtual_sold_updated_at: new Date().toISOString(),
        };
        adminDataService.saveUtilityItem(updatedUtil);
        const targetDisp = randomSold + currentRealSold;
        marketingService.syncProductVirtualSold(
          updatedUtil.id,
          randomSold,
          true,
          targetDisp,
          updatedUtil.virtual_sold_updated_at
        );
        updatedCount++;
      }
    });
    setUtilities(adminDataService.getUtilities());
    onShowToast?.(
      'Bổ sung số ảo thành công',
      `Đã cập nhật số ảo đã bán ngẫu nhiên (32–212) cho ${updatedCount} mục có số lượng dưới 10!`,
      'success'
    );
  };

  // --- PRODUCT FORM HANDLERS ---
  const handleOpenCreateProduct = () => {
    const defaultCat = categoriesList[0] || { id: 'account', label: 'Tài khoản Premium' };
    const defaultCover = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80';
    setEditingProduct(null);
    setProductForm({
      title: '',
      category: defaultCat.id,
      category_label: defaultCat.label,
      badge: 'HOT BÁN CHẠY',
      original_price: 100000,
      discount_percent: 0,
      current_price: 100000,
      stock_quantity: 0,
      show_sold_count: true,
      virtual_sold_count: 0,
      description: 'Thông tin tài khoản / key bản quyền chính hãng, bảo hành 1 đổi 1.',
      instructions: 'Đăng nhập thông tin được cấp tự động sau khi hoàn tất mua hàng.',
      guide_links: [{ id: 'guide_1', text: 'Xem hướng dẫn chi tiết tại đây', url: '' }],
      guide_url: '',
      guide_text: 'Xem hướng dẫn chi tiết tại đây',
      show_guide_link: true,
      show_warranty: false,
      warranty_text: 'Bảo hành 1 đổi 1 suốt chu kỳ',
      cover_image_url: defaultCover,
      product_images: [defaultCover],
      is_active: true,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: UtilityProduct) => {
    setEditingProduct(prod);

    let initialGuideLinks: Array<{ id: string; text: string; url: string }> = [];
    if (Array.isArray(prod.guide_links) && prod.guide_links.length > 0) {
      initialGuideLinks = prod.guide_links.map((item, idx) => ({
        id: item.id || `guide_${idx + 1}`,
        text: item.text || 'Xem hướng dẫn chi tiết tại đây',
        url: item.url || '',
      }));
    } else if (prod.guide_url) {
      initialGuideLinks = [{
        id: 'guide_1',
        text: prod.guide_text || 'Xem hướng dẫn chi tiết tại đây',
        url: prod.guide_url || '',
      }];
    } else {
      initialGuideLinks = [{ id: 'guide_1', text: 'Xem hướng dẫn chi tiết tại đây', url: '' }];
    }

    const existingImages = (Array.isArray(prod.product_images) && prod.product_images.length > 0)
      ? prod.product_images
      : ((prod.cover_image_url || prod.icon_url) ? [prod.cover_image_url || prod.icon_url || ''] : []);

    setProductForm({
      title: prod.title,
      category: prod.category || 'account',
      category_label: prod.category_label || 'Tài khoản Premium',
      badge: prod.badge || '',
      original_price: prod.original_price,
      discount_percent: prod.discount_percent,
      current_price: prod.current_price,
      stock_quantity: prod.stock_quantity || 0,
      show_sold_count: prod.show_sold_count !== false,
      virtual_sold_count: prod.virtual_sold_count || 0,
      description: prod.description || '',
      instructions: prod.instructions || '',
      guide_links: initialGuideLinks,
      guide_url: prod.guide_url || initialGuideLinks[0]?.url || '',
      guide_text: prod.guide_text || initialGuideLinks[0]?.text || 'Xem hướng dẫn chi tiết tại đây',
      show_guide_link: prod.show_guide_link !== false,
      show_warranty: prod.show_warranty === true,
      warranty_text: prod.warranty_text || 'Bảo hành 1 đổi 1 suốt chu kỳ',
      cover_image_url: prod.cover_image_url || prod.icon_url || existingImages[0] || '',
      product_images: existingImages,
      is_active: prod.is_active !== false,
    });
    setIsProductModalOpen(true);
  };

  const handleAddGuideLink = () => {
    setProductForm((prev) => ({
      ...prev,
      guide_links: [
        ...prev.guide_links,
        { id: `guide_${Date.now()}`, text: 'Xem hướng dẫn chi tiết tại đây', url: '' },
      ],
    }));
  };

  const handleRemoveGuideLink = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      guide_links: prev.guide_links.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateGuideLink = (index: number, field: 'text' | 'url', value: string) => {
    setProductForm((prev) => ({
      ...prev,
      guide_links: prev.guide_links.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleFormCategoryChange = (catId: string) => {
    const found = categoriesList.find((c) => c.id === catId);
    const label = found ? found.label : (catId === 'other' ? 'Tiện Ích Khác' : catId);

    setProductForm((prev) => ({
      ...prev,
      category: catId,
      category_label: label,
    }));
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      onShowToast('Lỗi', 'Vui lòng nhập tên danh mục tiện ích.', 'error');
      return;
    }
    const cleanName = newCatName.trim();
    const slug = cleanName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;

    const updated = adminDataService.saveUtilityCategory({
      id: slug,
      label: cleanName,
      icon: newCatIcon || '✨',
      isSystem: false,
    });
    setCategoriesList(updated);
    setNewCatName('');
    setNewCatIcon('✨');
    onShowToast('Thành công', `Đã tạo danh mục "${cleanName}".`, 'success');
  };

  const handleDeleteCategory = (cat: UtilityCategory) => {
    if (cat.isSystem) {
      onShowToast('Cảnh báo', 'Không thể xóa danh mục mặc định của hệ thống.', 'error');
      return;
    }
    const updated = adminDataService.deleteUtilityCategory(cat.id);
    setCategoriesList(updated);
    if (categoryFilter === cat.id) {
      setCategoryFilter('ALL');
    }
    setDeletingCat(null);
    onShowToast('Đã xóa danh mục', `Đã xóa danh mục "${cat.label}".`, 'info');
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title.trim()) {
      onShowToast('Lỗi', 'Vui lòng nhập tên gói tiện ích / dịch vụ.', 'error');
      return;
    }

    const targetId = editingProduct?.id || `ut_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const totalAvail = adminDataService.getInventory({ status: 'AVAILABLE' }).filter(
      (i) => i.sku === targetId || (editingProduct?.sku && i.sku === editingProduct.sku) || (i.productName && productForm.title && i.productName.trim().toLowerCase() === productForm.title.trim().toLowerCase())
    ).length;

    const finalStock = totalAvail;

    const originalPrice = Math.max(0, Number(productForm.original_price) || 0);
    const discountPercent = Math.max(0, Math.min(100, Number(productForm.discount_percent) || 0));
    const calculatedPrice = discountPercent > 0
      ? Math.round(originalPrice * (1 - discountPercent / 100))
      : originalPrice;

    const cleanGuideLinks = (productForm.guide_links || [])
      .map((item) => ({
        id: item.id,
        text: (item.text || '').trim(),
        url: (item.url || '').trim(),
      }))
      .filter((item) => item.text || item.url);

    const primaryUrl = cleanGuideLinks.find((l) => l.url)?.url || (productForm.guide_url || '').trim();
    const primaryText = cleanGuideLinks.find((l) => l.text)?.text || 'Xem hướng dẫn chi tiết tại đây';

    const finalImages = (productForm.product_images || []).filter((img) => typeof img === 'string' && img.trim().length > 0);
    const coverImg = (finalImages[0] || productForm.cover_image_url || '').trim();

    adminDataService.saveUtilityItem({
      id: targetId,
      title: productForm.title.trim(),
      category: productForm.category,
      category_label: productForm.category_label,
      badge: productForm.badge.trim() || undefined,
      original_price: originalPrice,
      discount_percent: discountPercent,
      current_price: calculatedPrice,
      stock_quantity: finalStock,
      created_at: editingProduct?.created_at || (editingProduct as any)?.createdAt || new Date().toISOString(),
      show_sold_count: productForm.show_sold_count,
      virtual_sold_count: Number(productForm.virtual_sold_count) || 0,
      description: productForm.description.trim(),
      instructions: productForm.instructions.trim() || undefined,
      guide_links: cleanGuideLinks,
      guide_url: primaryUrl,
      guide_text: primaryText,
      show_guide_link: productForm.show_guide_link,
      show_warranty: Boolean(productForm.show_warranty),
      warranty_text: (productForm.warranty_text || '').trim() || 'Bảo hành 1 đổi 1 suốt chu kỳ',
      icon_url: coverImg || undefined,
      cover_image_url: coverImg || undefined,
      product_images: finalImages.length > 0 ? finalImages : (coverImg ? [coverImg] : undefined),
      is_active: productForm.is_active,
    });

    onShowToast(
      'Thành công',
      editingProduct
        ? `Đã cập nhật gói ${productForm.title}.`
        : `Đã tạo gói tiện ích ${productForm.title} mới.`,
      'success'
    );
    setIsProductModalOpen(false);
    loadData();
  };

  // --- BATCH IMPORT (NHẬP KHO) HANDLERS ---
  const handleOpenBatchImport = (prod: UtilityProduct) => {
    setSelectedProductForBatch(prod);
    setBatchPrice(prod.current_price);
    setBatchLines('');
    setIsBatchOpen(true);
  };

  const executeImportItems = (
    itemsToImport: Array<Omit<InventoryItem, 'id' | 'createdAt'>>,
    duplicateCount: number = 0
  ) => {
    if (!selectedProductForBatch || itemsToImport.length === 0) return;

    adminDataService.addInventoryItemsBulk(itemsToImport);

    // Update stock quantity on utility accurately
    const totalAvail = adminDataService.getInventory({ status: 'AVAILABLE' }).filter(
      (i) =>
        i.sku === selectedProductForBatch.id ||
        (selectedProductForBatch.sku && i.sku === selectedProductForBatch.sku) ||
        (i.productName &&
          selectedProductForBatch.title &&
          i.productName.trim().toLowerCase() === selectedProductForBatch.title.trim().toLowerCase())
    ).length;
    selectedProductForBatch.stock_quantity = totalAvail;
    adminDataService.saveUtilityItem(selectedProductForBatch);
    adminDataService.pushFullStateToKV();

    onShowToast(
      'Nhập kho thành công!',
      duplicateCount > 0
        ? `Đã nạp thành công ${itemsToImport.length} mã vào kho (bao gồm ${duplicateCount} mã trùng lặp). Tổng kho hiện có: ${totalAvail} mã.`
        : `Đã nạp thêm ${itemsToImport.length} mã vào gói "${selectedProductForBatch.title}". Tổng kho hiện có: ${totalAvail} mã.`,
      'success'
    );
    setIsBatchOpen(false);
    setIsDuplicateModalOpen(false);
    setBatchLines('');
    setDuplicateItems([]);
    setPendingAllItems([]);
    setPendingUniqueItems([]);
    loadData();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBatch) return;

    const lines = batchLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      onShowToast('Lỗi', 'Vui lòng nhập ít nhất một dòng mã / tài khoản.', 'error');
      return;
    }

    const existingCodesSet = new Set(
      adminDataService.getInventory().map((i) => i.codeValue?.trim().toLowerCase())
    );
    const seenInBatchSet = new Set<string>();

    const allItems: Array<Omit<InventoryItem, 'id' | 'createdAt'>> = [];
    const uniqueItems: Array<Omit<InventoryItem, 'id' | 'createdAt'>> = [];
    const detectedDuplicates: DuplicateCodeItem[] = [];

    for (const line of lines) {
      const parts = line.split(/[|,\t]+/).map((p) => p.trim());
      const code = parts[0];
      const serial = parts[1] || undefined;
      if (code) {
        const lowerCode = code.toLowerCase();
        const itemObj: Omit<InventoryItem, 'id' | 'createdAt'> = {
          sku: selectedProductForBatch.id,
          productName: selectedProductForBatch.title,
          codeValue: code,
          serial: serial,
          price: batchPrice,
          status: 'AVAILABLE',
        };

        allItems.push(itemObj);

        if (existingCodesSet.has(lowerCode)) {
          detectedDuplicates.push({
            code,
            serial,
            reason: 'ALREADY_IN_INVENTORY',
            reasonText: 'Đã có trong kho',
          });
        } else if (seenInBatchSet.has(lowerCode)) {
          detectedDuplicates.push({
            code,
            serial,
            reason: 'DUPLICATE_IN_INPUT',
            reasonText: 'Trùng trong danh sách dán',
          });
        } else {
          seenInBatchSet.add(lowerCode);
          uniqueItems.push(itemObj);
        }
      }
    }

    if (allItems.length === 0) {
      onShowToast('Lỗi', 'Không tìm thấy mã hợp lệ nào để nhập.', 'error');
      return;
    }

    // Nếu phát hiện có mã trùng -> Hiển thị modal cảnh báo hỏi xác nhận
    if (detectedDuplicates.length > 0) {
      setDuplicateItems(detectedDuplicates);
      setPendingAllItems(allItems);
      setPendingUniqueItems(uniqueItems);
      setIsDuplicateModalOpen(true);
      return;
    }

    // Không có mã trùng -> nạp thẳng vào kho
    executeImportItems(allItems, 0);
  };

  const handleConfirmImportAll = () => {
    executeImportItems(pendingAllItems, duplicateItems.length);
  };

  const handleConfirmImportUniqueOnly = () => {
    if (!selectedProductForBatch) return;
    executeImportItems(pendingUniqueItems, 0);
  };

  // --- KHO CHI TIẾT ---
  const handleOpenDetail = (prod: UtilityProduct) => {
    setDetailProduct(prod);
    setSelectedDetailIds([]);
    setIsDetailOpen(true);
  };

  const handleDeleteProductConfirm = () => {
    if (!deletingProduct) return;
    adminDataService.deleteUtility(deletingProduct.id);
    onShowToast('Đã xóa', `Đã xóa gói "${deletingProduct.title}".`, 'info');
    setDeletingProduct(null);
    loadData();
  };

  const handleDeleteInventoryConfirm = () => {
    if (!deletingInventoryItem) return;
    const itemSku = deletingInventoryItem.sku;
    const itemProdName = deletingInventoryItem.productName;
    adminDataService.deleteInventoryItem(deletingInventoryItem.id);

    // Sync product stock quantity
    const targetProd = utilities.find(
      (p) =>
        (itemSku && (p.id === itemSku || (p.sku && p.sku === itemSku))) ||
        (itemProdName && p.title && p.title.trim().toLowerCase() === itemProdName.trim().toLowerCase())
    );
    const prodRealSku = targetProd?.sku;
    const remainingCount = adminDataService.getInventory({ status: 'AVAILABLE' }).filter(
      (i) => (itemSku && i.sku === itemSku) || (prodRealSku && i.sku === prodRealSku) || (itemProdName && i.productName && i.productName.trim().toLowerCase() === itemProdName.trim().toLowerCase())
    ).length;
    if (targetProd) {
      targetProd.stock_quantity = remainingCount;
      adminDataService.saveUtilityItem(targetProd);
    }

    onShowToast('Đã xóa mã', 'Mã code / tài khoản đã được xóa khỏi kho.', 'info');
    setDeletingInventoryItem(null);
    loadData();
  };

  const handleBulkDeleteDetailConfirm = () => {
    if (selectedDetailIds.length === 0 || !detailProduct) return;
    const count = adminDataService.deleteInventoryItemsBulk(selectedDetailIds);

    const itemSku = detailProduct.id;
    const itemRealSku = detailProduct.sku;
    const itemProdName = detailProduct.title;
    const remainingCount = adminDataService.getInventory({ status: 'AVAILABLE' }).filter(
      (i) => (itemSku && i.sku === itemSku) || (itemRealSku && i.sku === itemRealSku) || (itemProdName && i.productName && i.productName.trim().toLowerCase() === itemProdName.trim().toLowerCase())
    ).length;
    detailProduct.stock_quantity = remainingCount;
    adminDataService.saveUtilityItem(detailProduct);

    onShowToast('Đã xóa thành công', `Đã xóa ${count} mã khỏi kho của gói "${detailProduct.title}".`, 'success');
    setSelectedDetailIds([]);
    setIsBulkDeleteDetailOpen(false);
    loadData();
  };

  // Toggle Hết Hàng / Còn Hàng
  const handleToggleStock = (prod: UtilityProduct) => {
    const res = adminDataService.toggleProductStock(prod.id, 'utility');
    if (res.success) {
      onShowToast(
        res.isNowInStock ? 'Đã mở bán lại' : 'Đã chọn hết hàng',
        res.isNowInStock
          ? `Gói "${prod.title}" đã chuyển sang trạng thái còn hàng (${res.count} mã).`
          : `Gói "${prod.title}" đã được đánh dấu hết hàng.`,
        res.isNowInStock ? 'success' : 'info'
      );
      loadData();
    }
  };

  // Filter & Search with smart Vietnamese matching
  const filteredUtilities = utilities.filter((p) => {
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
    if (!searchQuery.trim()) return true;
    return smartVietnameseMatch(
      [p.title, p.description, p.category_label, p.category, p.badge, p.instructions],
      searchQuery
    );
  }).sort((a, b) => {
    if (sortFilter === 'PRICE_ASC') return a.current_price - b.current_price;
    if (sortFilter === 'PRICE_DESC') return b.current_price - a.current_price;
    if (sortFilter === 'STOCK') return (b.stock_quantity || 0) - (a.stock_quantity || 0);
    return 0; // NEWEST default
  });

  // Calculate utility-specific stock from inventory
  const utilityIdsSet = new Set(utilities.map((u) => u.id));
  const utilityTitlesSet = new Set(utilities.map((u) => u.title));
  const totalAvailableStock = inventory.filter(
    (i) => (i.sku && utilityIdsSet.has(i.sku)) || (i.productName && utilityTitlesSet.has(i.productName))
  ).filter((i) => i.status === 'AVAILABLE').length;

  const totalSoldStock = inventory.filter(
    (i) => (i.sku && utilityIdsSet.has(i.sku)) || (i.productName && utilityTitlesSet.has(i.productName))
  ).filter((i) => i.status === 'SOLD').length;

  const categories = [
    { id: 'ALL', label: 'Tất cả tiện ích', icon: Layers, emoji: '📦' },
    ...categoriesList.map((c) => {
      let IconComp: any = Tag;
      if (c.id === 'account') IconComp = Tv;
      else if (c.id === 'key') IconComp = KeyRound;
      else if (c.id === 'tool') IconComp = Wrench;
      else if (c.id === 'service') IconComp = Server;
      return {
        id: c.id,
        label: c.label,
        icon: IconComp,
        emoji: c.icon || '✨',
        isSystem: c.isSystem,
      };
    }),
  ];

  const getCategoryIcon = (cat?: string) => {
    const found = categoriesList.find((c) => c.id === cat);
    if (found && found.icon) return found.icon;
    switch (cat) {
      case 'account':
        return '📺';
      case 'key':
        return '🔑';
      case 'tool':
        return '🛠️';
      case 'service':
        return '🖥️';
      default:
        return '✨';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subtab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('utilities')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'utilities'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Danh Mục Tiện Ích & Dịch Vụ</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
            {utilities.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('wheel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'wheel'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <Dices className="w-3.5 h-3.5 text-amber-400" />
          <span>🎡 Thiết Lập Vòng Quay May Mắn</span>
        </button>
      </div>

      {subTab === 'wheel' ? (
        <LuckyWheelAdminManager onShowToast={onShowToast} contextTitle="Tiện Ích & Dịch Vụ" />
      ) : (
        <>
          {/* Top Header Card (Matching CodeInventoryModule) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Danh Mục Tiện Ích & Gói Dịch Vụ Bán</span>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full dark:bg-indigo-950/50 dark:text-indigo-400 font-mono">
                {utilities.length} Gói
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý các sản phẩm tiện ích, tài khoản Premium, key bản quyền, VPS, tồn kho mã thực tế và giá tiền tự động đồng bộ lên Web Khách.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tiện ích (Netflix, Spotify, Key Win, Tool, VPS...)"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="NEWEST">⚡ Mới thêm nhất</option>
              <option value="PRICE_ASC">Giá tăng dần</option>
              <option value="PRICE_DESC">Giá giảm dần</option>
              <option value="STOCK">Tồn kho nhiều nhất</option>
            </select>

            {/* BỘ LỌC HIỂN THỊ CỘT TRỰC QUAN (ĐÃ BÁN, HÀNG CÒN, SỐ ẢO) */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider">Hiển thị:</span>
              {/* Nút 1: Đã bán */}
              <button
                type="button"
                onClick={async () => {
                  const next = !showAdminSold;
                  setShowAdminSold(next);
                  localStorage.setItem('wcg_admin_show_sold_util', String(next));
                  localStorage.setItem('wcg_utilities_global_show_sold', String(next));
                  window.dispatchEvent(new CustomEvent('wcg_utilities_settings_updated', { detail: { showSold: next } }));
                  window.dispatchEvent(new Event('wcg_sold_count_updated'));
                  try {
                    await adminDataService.pushFullStateToKV(true);
                  } catch (e) {}
                  onShowToast(
                    'Cấu hình hiển thị Tiện Ích',
                    next ? 'Đã bật hiển thị "Đã bán" trên Web Khách & Admin' : 'Đã ẩn hiển thị "Đã bán" trên Web Khách & Admin',
                    'success'
                  );
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  showAdminSold
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white line-through opacity-70'
                }`}
                title={showAdminSold ? 'Đang hiện "Đã bán" trên Web Khách & Admin (Nhấn để ẩn)' : 'Đang ẩn "Đã bán" trên Web Khách & Admin (Nhấn để hiện)'}
              >
                {showAdminSold ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Đã bán</span>
              </button>

              {/* Nút 2: Hàng còn */}
              <button
                type="button"
                onClick={() => {
                  const next = !showAdminStock;
                  setShowAdminStock(next);
                  localStorage.setItem('wcg_admin_show_stock_util', String(next));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  showAdminStock
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white line-through opacity-70'
                }`}
                title={showAdminStock ? 'Đang hiện Hàng Còn (Nhấn để ẩn)' : 'Đang ẩn Hàng Còn (Nhấn để hiện)'}
              >
                {showAdminStock ? <Boxes className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Hàng còn</span>
              </button>

              {/* Nút 3: Số ảo Web */}
              <button
                type="button"
                onClick={() => {
                  const next = !showVirtualStats;
                  setShowVirtualStats(next);
                  localStorage.setItem('wcg_admin_show_virtual_stats', String(next));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  showVirtualStats
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white line-through opacity-70'
                }`}
                title={showVirtualStats ? 'Đang hiện Số Ảo Web (Nhấn để ẩn)' : 'Đang ẩn Số Ảo Web (Nhấn để hiện)'}
              >
                {showVirtualStats ? <Sparkles className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span>Số ảo Web</span>
              </button>
            </div>

            {/* VIEW MODE TOGGLE (NHÓM ĐẠI DIỆN VS TẤT CẢ GÓI LẺ) */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setViewMode('grouped');
                  localStorage.setItem('wcg_admin_util_view_mode', 'grouped');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Gom nhóm các gói cùng chủ đề thành sản phẩm đại diện"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Nhóm đại diện</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('flat');
                  localStorage.setItem('wcg_admin_util_view_mode', 'flat');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'flat'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Xem danh sách tất cả các gói lẻ"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Tất cả gói lẻ</span>
              </button>
            </div>

            {/* Bổ Sung Số Ảo Ngẫu Nhiên (32-212) */}
            <button
              type="button"
              onClick={handleRandomizeVirtualSoldUnder10}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm cursor-pointer transition-colors active:scale-95"
              title="Bổ sung số lượng bán ảo ngẫu nhiên từ 32 đến 212 cho các mặt hàng có số lượng đã bán dưới 10"
            >
              <Sparkles className="h-4 w-4" />
              <span>Bổ Sung Số Ảo (32–212)</span>
            </button>

            {/* Create Category Button */}
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm cursor-pointer transition-colors"
              title="Quản lý và tạo danh mục mới"
            >
              <FolderPlus className="h-4 w-4" />
              <span>+ Tạo Danh Mục</span>
            </button>

            {/* Create Product Button */}
            <button
              onClick={handleOpenCreateProduct}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow hover:opacity-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tạo Gói Mới</span>
            </button>
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-4 dark:border-slate-800">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isCurrent = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {cat.id === 'ALL' ? <Icon className="w-3.5 h-3.5" /> : <span>{cat.emoji || '✨'}</span>}
                <span>{cat.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shadow-sm ml-1"
            title="Thêm danh mục mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Thêm Danh Mục</span>
          </button>
        </div>

        {/* Mini KPI Bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Tổng Gói Bán:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{utilities.length}</strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Mã Sẵn Bán (Available):</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{totalAvailableStock} mã</strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Mã Đã Bán (Sold):</span>
            <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{totalSoldStock} mã</strong>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">Quy Đổi Tiền Tệ:</span>
            <strong className="text-purple-600 dark:text-purple-400 font-bold text-xs">1 VNĐ = 1 Core</strong>
          </div>
        </div>
      </div>

      {/* Product Cards Grid (Matching CodeInventoryModule) */}
      {viewMode === 'grouped' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupUtilitiesByTheme(filteredUtilities).map((parentUtil) => {
            const pkgs = getProductPackages(parentUtil);
            const pkgIdSet = new Set(pkgs.map((p) => p.id));
            const pkgNameSet = new Set(pkgs.map((p) => p.name.trim().toLowerCase()));

            const groupAvailableStock = inventory.filter(
              (i) =>
                ((i.sku && pkgIdSet.has(i.sku)) ||
                  (i.productName && pkgNameSet.has(i.productName.trim().toLowerCase()))) &&
                i.status === 'AVAILABLE'
            ).length;

            const groupSoldStock = inventory.filter(
              (i) =>
                ((i.sku && pkgIdSet.has(i.sku)) ||
                  (i.productName && pkgNameSet.has(i.productName.trim().toLowerCase()))) &&
                i.status === 'SOLD'
            ).length;

            const minPrice = Math.min(...pkgs.map((p) => p.price));

            return (
              <div
                key={parentUtil.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {getCategoryIcon(parentUtil.category)} {parentUtil.category_label || 'TIỆN ÍCH'}
                      </span>
                      {parentUtil.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {parentUtil.badge}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
                        {pkgs.length} gói tùy chọn
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        groupAvailableStock > 0
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {groupAvailableStock > 0 ? 'ĐANG BÁN' : 'HẾT HÀNG'}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="mt-3 flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                      <img
                        src={parentUtil.cover_image_url || parentUtil.icon_url || '/vite.svg'}
                        alt={parentUtil.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = '/vite.svg';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {parentUtil.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {parentUtil.description || 'Dòng sản phẩm tiện ích đám mây chính hãng.'}
                      </p>
                    </div>
                  </div>

                  {/* Overview Price & Stock */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">Từ</span>
                        <span className="font-mono text-base font-black text-amber-500 dark:text-amber-400">
                          {formatCurrencyVND(minPrice)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-500 font-mono">
                        Quy đổi: {formatCore(minPrice)}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5 font-mono text-[11px]">
                      {showAdminStock && (
                        <div>
                          <span className="text-slate-400 font-sans text-[10px]">Tổng kho: </span>
                          <strong className={`text-xs ${groupAvailableStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                            {groupAvailableStock > 0 ? `${groupAvailableStock} mã` : 'Hết hàng'}
                          </strong>
                        </div>
                      )}
                      {showAdminSold && (
                        <div>
                          <span className="text-slate-400 font-sans text-[10px]">Tổng bán: </span>
                          <strong className="text-slate-700 dark:text-slate-300 text-xs">{groupSoldStock}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variants / Packages Table */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Danh Sách Các Gói Con ({pkgs.length}):</span>
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {pkgs.map((pkg) => {
                        const originalProd = utilities.find((u) => u.id === pkg.id) || parentUtil;
                        const subStock = inventory.filter(
                          (i) =>
                            (i.sku === pkg.id ||
                              (originalProd.sku && i.sku === originalProd.sku) ||
                              (i.productName && i.productName.trim().toLowerCase() === originalProd.title.trim().toLowerCase())) &&
                            i.status === 'AVAILABLE'
                        ).length;

                        return (
                          <div
                            key={pkg.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {pkg.name}
                                </span>
                                {pkg.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    {pkg.badge}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${
                                    subStock > 0
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}
                                >
                                  {subStock > 0 ? `Kho: ${subStock}` : 'Hết mã'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {formatCurrencyVND(pkg.price)}
                                </span>
                                <span className="text-slate-400">({formatCore(pkg.price)})</span>
                              </div>
                            </div>

                            {/* Action Buttons for Sub Package */}
                            <div className="flex items-center gap-1 shrink-0 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleOpenBatchImport(originalProd)}
                                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-300 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Nhập thêm mã vào gói này"
                              >
                                <Upload className="w-2.5 h-2.5" />
                                <span>+ Nhập kho</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDetail(originalProd)}
                                className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 dark:text-teal-300 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Xem danh sách mã trong kho"
                              >
                                <Boxes className="w-2.5 h-2.5" />
                                <span>Kho</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setFomoAdjustProduct(originalProd)}
                                className="px-1.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-0.5 border border-amber-500/20"
                                title="Chỉnh số ảo & FOMO gói này"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                <span>Ảo</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStock(originalProd)}
                                className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-0.5 ${
                                  subStock > 0
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}
                                title={subStock > 0 ? 'Đánh dấu hết hàng' : 'Mở bán lại'}
                              >
                                {subStock > 0 ? <Ban className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(originalProd)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="Chỉnh sửa thông tin gói"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>Sửa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingProduct(originalProd)}
                                className="px-1.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:text-rose-400 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Xóa gói này"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUtilities.map((prod) => {
          const productStockCount = inventory.filter(
            (i) => (i.sku === prod.id || (prod.sku && i.sku === prod.sku) || (i.productName && i.productName.trim().toLowerCase() === prod.title.trim().toLowerCase())) && i.status === 'AVAILABLE'
          ).length;
          const displayStock = productStockCount;

          return (
            <div
              key={prod.id}
              className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-2.5 group"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {getCategoryIcon(prod.category)} {prod.category_label || (prod.category ? prod.category.toUpperCase() : 'TIỆN ÍCH')}
                    </span>
                    {prod.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {prod.badge}
                      </span>
                    )}
                    {prod.show_guide_link !== false && (() => {
                      const count = (Array.isArray(prod.guide_links) && prod.guide_links.length > 0)
                        ? prod.guide_links.filter((l) => l && (l.url?.trim() || l.text?.trim())).length
                        : (prod.guide_url?.trim() ? 1 : 0);
                      if (count === 0) return null;
                      return (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200 dark:border-teal-800" title={`Số link hướng dẫn: ${count}`}>
                          <Link2 className="w-2.5 h-2.5" />
                          {count > 1 ? `${count} HD` : 'Có HD'}
                        </span>
                      );
                    })()}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      prod.is_active !== false && displayStock > 0
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {prod.is_active !== false && displayStock > 0 ? 'ĐANG BÁN' : 'HẾT HÀNG'}
                  </span>
                </div>

                {/* Body Content */}
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    <img
                      src={prod.cover_image_url || prod.icon_url || '/vite.svg'}
                      alt={prod.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/vite.svg';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {prod.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                      {prod.description || 'Sản phẩm tiện ích và dịch vụ số ngoài lề chính hãng.'}
                    </p>
                  </div>
                </div>

                {/* Price & Stock Display */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-sm font-black text-amber-500 dark:text-amber-400">
                        {formatCurrencyVND(prod.current_price)}
                      </span>
                      {prod.original_price > prod.current_price && (
                        <>
                          <span className="font-mono text-[10px] text-slate-400 line-through">
                            {formatCurrencyVND(prod.original_price)}
                          </span>
                          <span className="text-[9px] font-bold text-rose-500">
                            -{prod.discount_percent}%
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-indigo-500 font-mono">
                      Quy đổi: {formatCore(prod.current_price)}
                    </span>
                  </div>

                  <div className="text-right space-y-0.5">
                    {/* Tầng 1: Kho Thật */}
                    <div className="text-[11px] font-mono">
                      {showAdminStock && (
                        <>
                          <span className="text-slate-400 font-sans text-[10px]">Kho: </span>
                          <strong className={`text-xs ${displayStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                            {displayStock > 0 ? `${displayStock} mã` : 'Hết hàng'}
                          </strong>
                        </>
                      )}
                      {showAdminStock && showAdminSold && <span className="text-slate-400 font-sans text-[10px] ml-1">| </span>}
                      {showAdminSold && (
                        <>
                          <span className="text-slate-400 font-sans text-[10px]">Bán: </span>
                          <strong className="text-slate-700 dark:text-slate-300 text-xs">{prod.sold_count || 0}</strong>
                        </>
                      )}
                      {!showAdminStock && !showAdminSold && (
                        <span className="text-[10px] text-slate-400 italic">Đã ẩn kho & bán</span>
                      )}
                    </div>

                    {/* Tầng 2: Web FOMO (Chỉ hiện khi bật công tắc Hiện Số Ảo) */}
                    {showVirtualStats && (() => {
                      const webStock = marketingService.getDisplayStock(prod.id, displayStock);
                      const webSold = marketingService.getSoldDisplay(prod);
                      const isStockFomoDiff = webStock !== displayStock;
                      const isSoldFomoDiff = webSold !== (prod.sold_count || 0);

                      return (
                        <div className="flex items-center justify-end gap-1 font-mono text-[10px] bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-amber-500 font-sans text-[9px] font-bold flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            Web:
                          </span>
                          {showAdminStock && (
                            <span className={`font-bold ${webStock > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                              Còn {webStock}
                            </span>
                          )}
                          {showAdminStock && showAdminSold && <span className="text-slate-300 dark:text-slate-600">|</span>}
                          {showAdminSold && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Bán {webSold}
                            </span>
                          )}
                          {(isStockFomoDiff || isSoldFomoDiff) && (
                            <span className="inline-flex items-center px-1 rounded text-[8px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title="Đang có số ảo FOMO">
                              Ảo
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => handleOpenBatchImport(prod)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Upload className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Nhập kho</span>
                  </button>

                  <button
                    onClick={() => handleOpenDetail(prod)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Boxes className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                    <span>Chi tiết</span>
                  </button>

                  {/* NÚT CHỈNH SỐ ẢO */}
                  <button
                    type="button"
                    onClick={() => setFomoAdjustProduct(prod)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold transition-colors cursor-pointer border border-amber-500/25 shadow-xs"
                    title="Điều chỉnh số ảo & FOMO hiển thị ngoài web cho tiện ích này"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Số ảo</span>
                  </button>

                  {/* Nút Chọn Hết Hàng / Còn Hàng */}
                  <button
                    type="button"
                    onClick={() => handleToggleStock(prod)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      displayStock > 0
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                    }`}
                    title={displayStock > 0 ? 'Bấm để đánh dấu hết hàng' : 'Bấm để mở bán lại'}
                  >
                    {displayStock > 0 ? (
                      <>
                        <Ban className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        <span>Hết hàng</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Còn hàng</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditProduct(prod)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                    title="Chỉnh sửa gói tiện ích"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={() => setDeletingProduct(prod)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                    title="Xóa gói tiện ích"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
      </>
      )}

      {/* CREATE / EDIT PRODUCT MODAL (WITH COMPRESSED IMAGE UPLOAD) */}
      <FormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Chỉnh Sửa Gói Tiện Ích Bán' : 'Tạo Gói Tiện Ích Bán Mới'}
        subtitle="Thiết lập tên gói, danh mục, giá niêm yết và tải ảnh từ máy tính (tự động nén siêu nhẹ)."
        maxWidth="lg"
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Danh Mục Tiện Ích <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Tạo danh mục mới
                </button>
              </div>
              <select
                value={productForm.category}
                onChange={(e) => handleFormCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.label}
                  </option>
                ))}
                {!categoriesList.some((c) => c.id === productForm.category) && productForm.category && (
                  <option value={productForm.category}>{productForm.category_label || productForm.category}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tên Gói Sản Phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={productForm.title}
                onChange={(e) => setProductForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: Tài Khoản Netflix Premium 4K 1 Tháng"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Giá Gốc (VND / Core) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={productForm.original_price === 0 ? '' : productForm.original_price}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  const disc = productForm.discount_percent || 0;
                  setProductForm((p) => ({
                    ...p,
                    original_price: val,
                    current_price: disc > 0 ? Math.round(val * (1 - disc / 100)) : val,
                  }));
                }}
                placeholder="Nhập giá bất kỳ (VD: 80000, 150000...)"
                className="mt-1 w-full font-mono font-bold rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chiết Khấu (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={productForm.discount_percent === 0 ? '' : productForm.discount_percent}
                onChange={(e) => {
                  const disc = e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value)));
                  const orig = productForm.original_price || 0;
                  setProductForm((p) => ({
                    ...p,
                    discount_percent: disc,
                    current_price: disc > 0 ? Math.round(orig * (1 - disc / 100)) : orig,
                  }));
                }}
                placeholder="0"
                className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs flex items-center justify-between border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Giá bán thực tế sau chiết khấu:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatCurrencyVND(
                productForm.discount_percent > 0
                  ? Math.round((productForm.original_price || 0) * (1 - (productForm.discount_percent || 0) / 100))
                  : (productForm.original_price || 0)
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Huy Hiệu Nổi Bật (Tùy chọn)
              </label>
              <input
                type="text"
                value={productForm.badge}
                onChange={(e) => setProductForm((p) => ({ ...p, badge: e.target.value }))}
                placeholder="VD: HOT BÁN CHẠY, BẢN QUYỀN 100%"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trạng Thái Mở Bán
              </label>
              <select
                value={productForm.is_active ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setProductForm((p) => ({ ...p, is_active: e.target.value === 'ACTIVE' }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
              >
                <option value="ACTIVE">🟢 Đang Mở Bán Trên Web</option>
                <option value="INACTIVE">🔴 Tạm Ẩn Khỏi Web</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mô Tả Gói & Quyền Lợi Sử Dụng
            </label>
            <textarea
              rows={2}
              value={productForm.description}
              onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="VD: Tài khoản Netflix 4K UHD profile riêng biệt, có mã PIN bảo mật..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Hướng Dẫn Kích Hoạt / Nhận Hàng Sau Khi Mua
            </label>
            <textarea
              rows={2}
              value={productForm.instructions}
              onChange={(e) => setProductForm((p) => ({ ...p, instructions: e.target.value }))}
              placeholder="VD: Đăng nhập email/pass được cấp tự động. Chọn đúng Profile số được chỉ định..."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Compressed Image Gallery Upload Component */}
          <ProductGalleryUpload
            label="Album Ảnh Gói Tiện Ích / Dịch Vụ (Nhiều Ảnh)"
            images={productForm.product_images || []}
            onChange={(imgs) => {
              setProductForm((p) => ({
                ...p,
                product_images: imgs,
                cover_image_url: imgs[0] || '',
              }));
            }}
            helperText="Tải lên nhiều ảnh từ máy tính hoặc dán link URL. Ảnh đầu tiên (⭐) sẽ tự động làm ảnh bìa chính trên trang chủ và danh sách."
          />

          {/* Sold Count & Virtual Display Configuration */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Hiển thị số lượng đã bán (Trang khách)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bật/tắt huy hiệu "Đã bán: X" trên sản phẩm và modal chi tiết tiện ích.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.show_sold_count}
                  onChange={(e) => setProductForm((p) => ({ ...p, show_sold_count: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {productForm.show_sold_count && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Số Lượng Đã Bán Ảo Bổ Sung</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-normal">
                    Khách thấy: <strong className="font-bold">{(editingProduct?.sold_count || 0) + (Number(productForm.virtual_sold_count) || 0)}</strong> (Thật: {editingProduct?.sold_count || 0} + Ảo: {Number(productForm.virtual_sold_count) || 0})
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={productForm.virtual_sold_count}
                  onChange={(e) => setProductForm((p) => ({ ...p, virtual_sold_count: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  placeholder="0"
                  className="mt-1 w-full font-mono rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Guide Links & Visibility Configuration */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-teal-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Đường Link Hướng Dẫn Cho Khách Hàng
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bật/tắt và tùy chỉnh các dòng chữ hướng dẫn kèm liên kết trên trang khách.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={productForm.show_guide_link}
                  onChange={(e) => setProductForm((p) => ({ ...p, show_guide_link: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {productForm.show_guide_link && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Danh Sách Dòng Hướng Dẫn ({productForm.guide_links.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddGuideLink}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-400 dark:hover:bg-teal-900/50 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng hướng dẫn</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {productForm.guide_links.map((linkItem, idx) => (
                    <div
                      key={linkItem.id || idx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                          <span>Dòng hướng dẫn #{idx + 1}</span>
                        </span>
                        {productForm.guide_links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGuideLink(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title="Xóa dòng hướng dẫn này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                            Nội Dung Dòng Chữ Hiển Thị
                          </label>
                          <input
                            type="text"
                            value={linkItem.text}
                            onChange={(e) => handleUpdateGuideLink(idx, 'text', e.target.value)}
                            placeholder="VD: Xem hướng dẫn chi tiết tại đây"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 p-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                            Địa Chỉ Đường Link (URL)
                          </label>
                          <input
                            type="text"
                            value={linkItem.url}
                            onChange={(e) => handleUpdateGuideLink(idx, 'url', e.target.value)}
                            placeholder="VD: https://huongdan.com/kich-hoat-tai-khoan"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 p-2 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                  <p>
                    💡 <strong>Tùy chỉnh linh hoạt:</strong> Bạn có thể đổi chữ thành bất kỳ câu nào bạn muốn (VD: <em>"Xem clip hướng dẫn sử dụng tại đây"</em>, <em>"Kênh hỗ trợ Telegram / Zalo"</em>...).
                  </p>
                  <p>
                    🔗 Nếu câu có chữ <span className="font-bold text-teal-600 dark:text-teal-400 underline">"tại đây"</span>, web sẽ tự động gạch chân và gắn link vào chữ đó. Bạn có thể bấm nút <strong>"+ Thêm dòng hướng dẫn"</strong> ở trên để thêm nhiều liên kết khác nhau.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Warranty Configuration (Cam Kết Bảo Hành) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Cam Kết Bảo Hành (Trang Khách)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bật/tắt huy hiệu cam kết bảo hành trong popup chi tiết tiện ích. (Mặc định: Ẩn)
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={productForm.show_warranty}
                  onChange={(e) => setProductForm((p) => ({ ...p, show_warranty: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {productForm.show_warranty && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nội Dung Cam Kết Bảo Hành
                </label>
                <input
                  type="text"
                  value={productForm.warranty_text}
                  onChange={(e) => setProductForm((p) => ({ ...p, warranty_text: e.target.value }))}
                  placeholder="VD: Bảo hành 1 đổi 1 suốt chu kỳ"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{editingProduct ? 'Cập Nhật Gói' : 'Tạo Gói Mới'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* BATCH IMPORT MODAL (NHẬP KHO HÀNG LOẠT) */}
      <FormModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title={`Nhập Kho: ${selectedProductForBatch?.title}`}
        subtitle="Dán danh sách mã code / tài khoản vào ô bên dưới (mỗi dòng 1 mã). Hệ thống sẽ tự động thêm vào kho."
        maxWidth="lg"
      >
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Sản phẩm nhập kho:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{selectedProductForBatch?.title}</strong>
            </div>
            <div className="text-right font-mono">
              <span className="text-slate-400 block text-[11px]">Giá bán mỗi mã:</span>
              <strong className="text-emerald-600 font-bold">{formatCurrencyVND(batchPrice)}</strong>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Danh Sách Mã / Tài Khoản (Mỗi dòng 1 mục, hoặc CODE | SERIAL/GHI CHÚ) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-indigo-600 font-bold">
                {batchLines.split('\n').filter((l) => l.trim()).length} mã phát hiện
              </span>
            </div>
            <textarea
              required
              rows={8}
              value={batchLines}
              onChange={(e) => setBatchLines(e.target.value)}
              placeholder="VD:&#10;user1@netflix.com:pass123 | PIN: 1234&#10;user2@netflix.com:pass456 | PIN: 5678&#10;W269N-WFGWX-YVC9B-4J6C9-T83GX | Key Win 11 Pro"
              className="mt-1 w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-3 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsBatchOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Nạp Tất Cả Vào Kho</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* KHO CHI TIẾT MODAL */}
      <FormModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDetailIds([]);
        }}
        title={`Kho Chi Tiết: ${detailProduct?.title}`}
        subtitle="Danh sách các mã code / tài khoản thực tế trong kho sẵn sàng giao cho khách hàng."
        maxWidth="xl"
      >
        <div className="space-y-4">
          {detailProduct && (() => {
            const productCodes = inventory
              .filter((i) => i.sku === detailProduct.id || (detailProduct.sku && i.sku === detailProduct.sku) || (i.productName && detailProduct.title && i.productName.trim().toLowerCase() === detailProduct.title.trim().toLowerCase()))
              .sort((a, b) => {
                const order: Record<string, number> = { AVAILABLE: 1, HOLD: 2, SOLD: 3 };
                const rankA = order[a.status || 'AVAILABLE'] ?? 2;
                const rankB = order[b.status || 'AVAILABLE'] ?? 2;
                if (rankA !== rankB) return rankA - rankB;
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
              });

            const availCount = productCodes.filter((i) => i.status === 'AVAILABLE').length;
            const soldCount = productCodes.filter((i) => i.status === 'SOLD').length;
            const isAllSelected = productCodes.length > 0 && productCodes.every((i) => selectedDetailIds.includes(i.id));

            return (
              <>
                {/* Detail Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={() => {
                          if (isAllSelected) {
                            setSelectedDetailIds([]);
                          } else {
                            setSelectedDetailIds(productCodes.map((i) => i.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                      <span>Chọn tất cả ({productCodes.length} mã)</span>
                    </label>

                    <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/50">
                        Sẵn bán: {availCount}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-bold">
                        Đã xuất: {soldCount}
                      </span>
                    </div>
                  </div>

                  {selectedDetailIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsBulkDeleteDetailOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa {selectedDetailIds.length} mã đã chọn</span>
                    </button>
                  )}
                </div>

                {/* List of Codes */}
                <div className="max-h-[55vh] overflow-y-auto space-y-2">
                  {productCodes.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Chưa có mã code nào trong kho cho gói này. Bấm "Nhập kho" để thêm mã.
                    </div>
                  ) : (
                    productCodes.map((item) => {
                      const isSelected = selectedDetailIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'border-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedDetailIds(selectedDetailIds.filter((id) => id !== item.id));
                                } else {
                                  setSelectedDetailIds([...selectedDetailIds, item.id]);
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 shrink-0"
                            />
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 truncate max-w-sm">
                              {item.codeValue}
                            </span>
                            {item.serial && (
                              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                Ghi chú: {item.serial}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.status === 'AVAILABLE' ? 'Sẵn Bán' : 'Đã Xuất'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCopy(item.codeValue, item.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title="Sao chép"
                            >
                              {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingInventoryItem(item)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="Xóa mã"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}

          <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedDetailIds([]);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </FormModal>

      {/* Delete Product Modal */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProductConfirm}
        title="Xác Nhận Xóa Gói Tiện Ích"
        message={`Bạn có chắc muốn xóa gói "${deletingProduct?.title}" khỏi hệ thống? Thao tác này sẽ đồng thời xóa toàn bộ mã kho liên quan.`}
        confirmText="Xóa Gói"
        variant="danger"
      />

      {/* Delete Single Code Modal */}
      <ConfirmModal
        isOpen={!!deletingInventoryItem}
        onClose={() => setDeletingInventoryItem(null)}
        onConfirm={handleDeleteInventoryConfirm}
        title="Xác Nhận Xóa Mã Code"
        message={`Bạn có chắc muốn xóa mã ${deletingInventoryItem?.codeValue}?`}
        confirmText="Xóa Mã"
        variant="danger"
      />

      {/* Delete Bulk Inventory Codes Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteDetailOpen}
        onClose={() => setIsBulkDeleteDetailOpen(false)}
        onConfirm={handleBulkDeleteDetailConfirm}
        title="Xác Nhận Xóa Nhiều Mã Code"
        message={`Bạn có chắc muốn xóa vĩnh viễn ${selectedDetailIds.length} mã code đã chọn khỏi kho của gói "${detailProduct?.title}"?`}
        confirmText={`Xóa ${selectedDetailIds.length} mã`}
        variant="danger"
      />

      {/* CẢNH BÁO MÃ TRÙNG LẶP MODAL */}
      <DuplicateCodesModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        onConfirmAll={handleConfirmImportAll}
        onConfirmUniqueOnly={pendingUniqueItems.length > 0 ? handleConfirmImportUniqueOnly : undefined}
        productTitle={selectedProductForBatch?.title}
        totalInputCount={pendingAllItems.length}
        duplicates={duplicateItems}
        newCount={pendingUniqueItems.length}
      />

      {/* QUẢN LÝ DANH MỤC TIỆN ÍCH MODAL */}
      <FormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Quản Lý Danh Mục Tiện Ích"
        subtitle="Tạo danh mục mới bất kỳ lúc nào để phân loại các sản phẩm, tài khoản, key hoặc dịch vụ."
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Form thêm mới */}
          <form onSubmit={handleCreateCategory} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FolderPlus className="h-4 w-4 text-indigo-500" />
              Tạo Danh Mục Mới
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Tên Danh Mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="VD: Tài Khoản Chat GPT, Dịch Vụ AI, Phần Mềm Thiết Kế..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Icon / Biểu Tượng
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    maxLength={4}
                    className="w-16 text-center text-base rounded-xl border border-slate-200 bg-white py-1.5 text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <div className="flex-1 flex items-center gap-1 overflow-x-auto py-0.5">
                    {['✨', '🤖', '🎮', '💎', '⚡', '🌐', '🚀', '📦'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCatIcon(emoji)}
                        className={`p-1 text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${
                          newCatIcon === emoji ? 'bg-indigo-100 dark:bg-indigo-950/60 ring-1 ring-indigo-500' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm Danh Mục
              </button>
            </div>
          </form>

          {/* Danh sách danh mục hiện có */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Danh Sách Danh Mục ({categoriesList.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Các danh mục hệ thống mặc định được bảo vệ không thể xóa.
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              {categoriesList.map((cat) => {
                const count = utilities.filter((u) => u.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {cat.icon || '✨'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {cat.label}
                          </span>
                          {cat.isSystem ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Hệ thống
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                              Tùy chỉnh
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Mã ID: <code className="font-mono text-slate-500">{cat.id}</code> • {count} sản phẩm
                        </div>
                      </div>
                    </div>

                    <div>
                      {cat.isSystem ? (
                        <span className="text-xs text-slate-400 italic px-2">Cố định</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingCat(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </FormModal>

      {/* Delete Category Modal */}
      <ConfirmModal
        isOpen={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        onConfirm={() => deletingCat && handleDeleteCategory(deletingCat)}
        title="Xác Nhận Xóa Danh Mục"
        message={`Bạn có chắc muốn xóa danh mục "${deletingCat?.label}"? Các sản phẩm thuộc danh mục này vẫn được giữ nguyên trong cơ sở dữ liệu.`}
        confirmText="Xóa Danh Mục"
        variant="danger"
      />

      {/* Quick FOMO Adjust Modal */}
      {fomoAdjustProduct && (
        <QuickFomoAdjustModal
          isOpen={!!fomoAdjustProduct}
          onClose={() => setFomoAdjustProduct(null)}
          itemType="utility"
          itemId={fomoAdjustProduct.id}
          itemTitle={fomoAdjustProduct.title}
          gameName="Tiện ích & Dịch vụ"
          realStock={inventory.filter(
            (i) => (i.sku === fomoAdjustProduct.id || (fomoAdjustProduct.sku && i.sku === fomoAdjustProduct.sku) || (i.productName && i.productName.trim().toLowerCase() === fomoAdjustProduct.title.trim().toLowerCase())) && i.status === 'AVAILABLE'
          ).length}
          realSoldOrClaimed={fomoAdjustProduct.sold_count || 0}
          onSuccess={() => {
            setUtilities(adminDataService.getUtilities());
            setInventory(adminDataService.getInventory());
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
