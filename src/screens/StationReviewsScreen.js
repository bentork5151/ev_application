import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/GlobalStyles';
import { ArrowLeft, Star, MessageSquarePlus } from 'lucide-react-native';
import { reviewsApi } from '../services/api';
import { authService } from '../services/auth';
import ReviewCard from '../components/ReviewCard';
import AddReviewModal from '../components/AddReviewModal';
import StarRating from '../components/StarRating';
import { useTheme } from '../context/ThemeContext';

export default function StationReviewsScreen({ navigation, route }) {
    const { theme } = useTheme();
    const { stationId, stationName } = route.params;
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [myReview, setMyReview] = useState(null); // The current user's review if exists

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingReview, setEditingReview] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const user = await authService.getUser();
            setCurrentUser(user);

            const [reviewsData, summaryData, myReviewData] = await Promise.all([
                reviewsApi.getStationReviews(stationId),
                reviewsApi.getStationRatingSummary(stationId),
                reviewsApi.getMyReview(stationId) // Check if user already reviewed
            ]);

            setReviews(reviewsData || []);
            setSummary(summaryData);
            setMyReview(myReviewData);
        } catch (error) {
            console.error("Failed to load reviews:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [stationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAddReview = () => {
        setEditingReview(null);
        setIsModalVisible(true);
    };

    const handleEditReview = (review) => {
        setEditingReview(review);
        setIsModalVisible(true);
    };

    const handleDeleteReview = async (reviewId) => {
        try {
            await reviewsApi.deleteReview(reviewId);
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>{stationName || 'Station Reviews'}</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Ratings & Reviews</Text>
                </View>
            </View>

            {loading ? (
                <View style={[styles.center, { flex: 1 }]}>
                    <ActivityIndicator size="large" color="#00B074" />
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00B074" />}
                    ListHeaderComponent={() => (
                        <View style={styles.summaryContainer}>
                            <View style={[styles.ratingBigBox, { backgroundColor: theme.cardBg, borderColor: theme.divider }]}>
                                <Text style={[styles.bigRating, { color: theme.textPrimary }]}>{summary?.averageRating ? summary.averageRating.toFixed(1) : '0.0'}</Text>
                                <StarRating rating={summary?.averageRating || 0} size={20} />
                                <Text style={[styles.totalCount, { color: theme.textSecondary }]}>{summary?.totalReviews || 0} reviews</Text>
                            </View>

                            {/* Write Review CTA */}
                            {!myReview && (
                                <TouchableOpacity style={[styles.writeBtn, { backgroundColor: theme.white }]} onPress={handleAddReview}>
                                    <MessageSquarePlus size={20} color={theme.textPrimary} />
                                    <Text style={[styles.writeBtnText, { color: theme.textPrimary }]}>Write a Review</Text>
                                </TouchableOpacity>
                            )}

                            {myReview && (
                                <View style={styles.myReviewContainer}>
                                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Your Review</Text>
                                    <ReviewCard
                                        review={myReview}
                                        isOwnReview={true}
                                        onEdit={handleEditReview}
                                        onDelete={handleDeleteReview}
                                    />
                                </View>
                            )}

                            {reviews.length > 0 && <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>All Reviews</Text>}
                        </View>
                    )}
                    renderItem={({ item }) => {
                        // Don't show myReview in the main list to avoid duplication if it's already shown in header
                        if (myReview && item.id === myReview.id) return null;

                        return (
                            <ReviewCard
                                review={item}
                                isOwnReview={currentUser && (item.userId === currentUser.id || item.user?.id === currentUser.id)}
                                onEdit={handleEditReview}
                                onDelete={handleDeleteReview}
                            />
                        );
                    }}
                    ListEmptyComponent={() => (
                        !myReview && (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No reviews yet. Be the first to review!</Text>
                            </View>
                        )
                    )}
                />
            )}

            <AddReviewModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                stationId={stationId}
                existingReview={editingReview}
                onReviewSubmitted={() => {
                    fetchData(); // Refresh data after submit
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 16,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    summaryContainer: {
        marginBottom: 20,
    },
    ratingBigBox: {
        alignItems: 'center',
        marginBottom: 20,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
    },
    bigRating: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    totalCount: {
        marginTop: 8,
    },
    writeBtn: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    writeBtnText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    myReviewContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    }
});
