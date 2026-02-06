import { useState, useEffect } from 'react';
import { saveSQLLiteCategoryData, savePIBData, getCategoryDataSQLlite } from '../../storage/sqllite/categoryData/CategoryDataSchema';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

export const useGetAndSyncCategoryData = ({ categoryId }) => {
    const [categoryData, setCategoryData] = useState();
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { lang } = 'en';

    const fetchCategoryData = async (categoryId, fetchPage = page) => {
        // Check for internet connectivity using NetInfo
        const netInfoState = await NetInfo.fetch();
        if (!netInfoState.isConnected) {
            await getLocalCategoryData(categoryId);
            return;
        }

        setLoading(true);
        try {
            const postData = {
                lang: 'en',
                page: fetchPage,
                ...(categoryId !== 'hotTrends' && { category: categoryId }),
            };
            const response = await axios.post(`https://qasamvadini.aicte-india.org/api/category/get-category-data`, postData);
            if (response.status === 200 && response.data.data.data) {
                const newData = response.data.data.data;
                const hasMore = response.data.data.has_more;
                const localDataIds = new Set(categoryData?.data ? categoryData.data.map(item => item._id) : []);
                const uniqueNewData = newData?.filter(item => !localDataIds.has(item._id));

                if (uniqueNewData.length > 0) {
                    if (categoryId === "Central Govt. Schemes, Policies") {
                        await savePIBData(uniqueNewData);
                    } else {
                        await saveSQLLiteCategoryData(uniqueNewData);
                    }
                    // After saving, force a refresh from the database
                    await getLocalCategoryData(categoryId, true); // Pass a flag to reset data
                    setCategoryData(prev => ({
                        ...prev,
                        hasMore: hasMore
                    }));
                } else {
                    setCategoryData(prev => ({
                        ...prev,
                        hasMore: false
                    }));
                }
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    const getLocalCategoryData = async (categoryId, forceRefresh = false) => {
        setLoading(true);
        try {
            const localData = await getCategoryDataSQLlite(categoryId);
            if (localData && Array.isArray(localData) && localData.length > 0) {
                // Use 100 per page for PIB, 50 for others
                const itemsPerPage = categoryId === "Central Govt. Schemes, Policies" ? 100 : 50;
                const startIndex = (page - 1) * itemsPerPage;
                const paginatedData = localData.slice(startIndex, startIndex + itemsPerPage);

                setCategoryData(prev => ({
                    data: (page === 1 || forceRefresh) ? paginatedData : [...paginatedData], // Always replace, never append
                    hasMore: startIndex + itemsPerPage < localData.length
                }));
            } else {
                setCategoryData({ data: [], hasMore: false });
            }
        } catch (error) {
            console.error("Error fetching local data:", error);
            setError(error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreCategoryData = async () => {
        if (categoryData.hasMore) {
            setPage(page + 1);
        }
    };

    // New search function that respects internet connectivity
    const searchCategoryData = async (query) => {
        setSearchQuery(query);
        if (!query?.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);

        // Check for internet connectivity
        const netInfoState = await NetInfo.fetch();

        try {
            if (netInfoState.isConnected) {
                const postData = {
                    lang,
                    query,
                    ...(categoryId !== 'hotTrends' && { category: categoryId }),
                };

                // const response = await axiosConn('post', 'api/category/search-category-data', postData);
                const response = await axios.post(`https://qasamvadini.aicte-india.org/api/category/search-category-data`, postData);

                if (response.status === 200 && response.data.data) {
                    setSearchResults(response.data.data);
                } else {
                    setError(response.data.message);
                    setSearchResults([]);
                }
            } else {
                const localData = await getCategoryDataSQLlite(categoryId);
                if (localData && Array.isArray(localData)) {
                    const lowercaseQuery = query.toLowerCase();
                    const filteredResults = localData?.filter(item =>
                        item.title?.toLowerCase()?.includes(lowercaseQuery) ||
                        item.description?.toLowerCase()?.includes(lowercaseQuery) ||
                        item.tags?.some(tag => tag?.toLowerCase()?.includes(lowercaseQuery))
                    );
                    setSearchResults(filteredResults);
                } else {
                    setSearchResults([]);
                }
            }
        } catch (error) {
            console.error("Error during search:", error);
            setError(error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset page and data when language or category changes
        setPage(1);
        setCategoryData({ data: [], hasMore: true });
        // Immediately fetch new data for the new language/category
        fetchCategoryData(categoryId, 1); // Pass page 1 explicitly
    }, [lang, categoryId]);

    useEffect(() => {
        if (page === 1) return; // Already handled by the above effect
        const fetchData = async () => {
            await getLocalCategoryData(categoryId);
            if (!categoryData?.data?.length || categoryData?.hasMore) {
                await fetchCategoryData(categoryId, page);
            }
        };
        fetchData();
    }, [page]);

    return {
        categoryData,
        loading,
        error,
        loadMoreCategoryData,
        searchCategoryData,
        searchResults,
        searchQuery
    };
};

