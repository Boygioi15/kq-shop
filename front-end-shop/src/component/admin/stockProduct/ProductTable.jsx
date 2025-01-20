import { AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { VscDebugPause, VscDebugContinue } from "react-icons/vsc";
import { formatVND } from "../../../utils/format";
import React, { useState, useEffect } from "react";
import { getCategoryById, removeProduct, markProductContinue, markProductStop } from "../../../config/api";
import { toast } from "react-toastify";

const ProductTable = ({ products, onProductDeleted, onStatusChanged }) => {
  const [categoryNames, setCategoryNames] = useState({});
  const [failedCategories, setFailedCategories] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      const uniqueCategories = [...new Set(products.map(p => p.categoryRef))];
      
      try {
        const results = await Promise.all(
          uniqueCategories.map(async (catId) => {
            try {
              // Add 5 second timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              const response = await getCategoryById(catId);
              clearTimeout(timeoutId);
              
              return { id: catId, name: response.data.name, success: true };
            } catch (err) {
              setFailedCategories(prev => new Set([...prev, catId]));
              return { id: catId, name: 'Unknown Category', success: false };
            }
          })
        );
        
        const categoryMap = results.reduce((acc, { id, name }) => {
          acc[id] = name;
          return acc;
        }, {});
        
        setCategoryNames(categoryMap);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    if (products.length > 0) {
      loadCategories();
    }
  }, [products]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB").format(date);
  };

  const handleStatusChange = async (productId, newStatus) => {
    try {
      setLoadingStatus(productId);
      if (newStatus) {
        await markProductContinue(productId);
        console.log('Product continued:', newStatus);
      } else {
        await markProductStop(productId);
        console.log('Product stopped:', newStatus);
      }
      onStatusChanged && onStatusChanged(productId, newStatus);
      toast.success(`Sản phẩm đã ${newStatus ? 'được đăng bán' : 'tạm ngưng'}`);
    } catch (error) {
      toast.error('Cập nhật trạng thái thất bại');
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        setIsDeleting(true);
        setSelectedProductId(productId);
        await removeProduct(productId);
        toast.success('Xóa sản phẩm thành công');
        if (onProductDeleted) {
          onProductDeleted(productId); 
        }
      } catch (error) {
        toast.error('Xóa sản phẩm thất bại');
        console.error('Delete error:', error);
      } finally {
        setIsDeleting(false);
        setSelectedProductId(null);
      }
    }
  };

  return (
    <div className="hidden md:block">
      <table className="w-full bg-white table-auto shadow-md rounded-lg">
        <thead className="rounded-t-lg">
          <tr className="bg-white">
            <th className="p-5 text-left rounded-full">Hình ảnh</th>
            <th className="p-5 text-left">Tên sản phẩm</th>
            <th className="p-5 text-left">Số lượng</th>
            <th className="p-5 text-left">Giá</th>
            <th className="p-5 text-left">Danh mục</th>
            <th className="p-5 text-left">Màu sắc</th>
            <th className="p-5 text-left">Kích thước</th>
            <th className="p-5 text-left">Ngày thêm</th>
            <th className="p-5 text-center rounded-full">Tùy chọn</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product._id} className="hover:bg-gray-50">
              <td className="p-5 border-b">
                <img
                  src={product.init_ThumbnailURL || "https://via.placeholder.com/50"}
                  className="h-10 w-10 rounded"
                  alt={product.name}
                />
              </td>
              <td className="p-5 border-b text-mainColor font-semibold">
                {product.name}
              </td>
              <td className="p-5 border-b">
                {product.types.reduce((total, type) => 
                  total + type.details.reduce((sum, detail) => sum + detail.inStorage, 0)
                , 0)}
              </td>
              <td className="p-5 border-b">
                {formatVND(product.types[0]?.details[0]?.price || 0)}
              </td>
              <td className="p-5 border-b text-mainColor">
                {failedCategories.has(product.categoryRef) 
                  ? 'Failed to load'
                  : (categoryNames[product.categoryRef] || 'Loading...')}
              </td>
              <td className="p-5 border-b">
                {product.types.map(type => type.color_name).join(", ")}
              </td>
              <td className="p-5 border-b">
                {product.types[0]?.details.map(detail => detail.size_name).join(", ")}
              </td>
              <td className="p-5 border-b text-gray-700 font-semibold">
                {formatDate(product.createdAt)}
              </td>
              <td className="p-5 border-b text-center">
                <div className="flex justify-center items-center gap-x-2">
                  <AiOutlineEdit className="text-blue-500 cursor-pointer hover:text-blue-700" />
                  <AiOutlineDelete 
                    className={`text-red-500 cursor-pointer hover:text-red-700 ${
                      isDeleting && selectedProductId === product._id ? 'opacity-50' : ''
                    }`}
                    onClick={() => !isDeleting && handleDelete(product._id)}
                  />
                  {loadingStatus === product._id ? (
                    <span className="text-gray-400">Loading...</span>
                  ) : product.isPublished ? (
                    <VscDebugPause 
                      className="text-yellow-500 cursor-pointer hover:text-yellow-700"
                      onClick={() => handleStatusChange(product._id, false)}
                      title="Tạm ngưng bán"
                    />
                  ) : (
                    <VscDebugContinue 
                      className="text-green-500 cursor-pointer hover:text-green-700"
                      onClick={() => handleStatusChange(product._id, true)}
                      title="Đăng bán"
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
