import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/GlobalStyles';
import { MessageSquarePlus } from 'lucide-react-native';
import { reviewsApi } from '../services/api';
import { authService } from '../services/auth';
import ReviewCard from './ReviewCard';
import AddReviewModal from './AddReviewModal';
import StarRating from './StarRating';
import { useAlert } from '../context/AlertContext';
import LoginRequiredDialog from './LoginRequiredDialog';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

export default function StationReviewsTab({ stationId, stationName }) {
    const { theme } = useTheme();
    const { showAlert } = useAlert();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [myReview, setMyReview] = useState(null);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [loginPromptVisible, setLoginPromptVisible] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        const checkGuest = async () => {
            const guest = await authService.isGuestMode();
            setIsGuest(guest);
        };
        checkGuest();
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const user = await authService.getUser();
            setCurrentUser(user);

            const [reviewsData, summaryData, myReviewData] = await Promise.all([
                reviewsApi.getStationReviews(stationId),
                reviewsApi.getStationRatingSummary(stationId),
                reviewsApi.getMyReview(stationId)
            ]);

            setReviews(reviewsData || []);
            setSummary(summaryData);
            setMyReview(myReviewData);
        } catch (error) {
            console.error("Failed to load reviews:", error);
        } finally {
            setLoading(false);
        }
    }, [stationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddReview = () => {
        if (isGuest) {
            setLoginPromptVisible(true);
            return;
        }
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
            fetchData();
        } catch (error) {
            console.error("Delete failed:", error);
            showAlert("Error", "Failed to delete review.");
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#00B074" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
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

                {(reviews.length > 0 || myReview) && <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 20 }]}>All Reviews</Text>}

                {reviews.length === 0 && !myReview && (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No reviews yet. Be the first to review!</Text>
                    </View>
                )}

                {reviews.map((item) => {
                    if (myReview && item.id === myReview.id) return null;
                    return (
                        <ReviewCard
                            key={item.id}
                            review={item}
                            isOwnReview={!!(currentUser?.id) && (item.userId === currentUser.id || item.user?.id === currentUser.id)}
                            onEdit={handleEditReview}
                            onDelete={handleDeleteReview}
                        />
                    );
                })}
            </View>

            <AddReviewModal
                visible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                stationId={stationId}
                existingReview={editingReview}
                onReviewSubmitted={() => {
                    fetchData();
                }}
            />

            {/* Login Required Dialog */}
            <LoginRequiredDialog
                visible={loginPromptVisible}
                contextMessage="Sign in to share your experience"
                onLoginPress={() => {
                    setLoginPromptVisible(false);
                    navigation.navigate('Login', {
                        returnRoute: 'StationDetails',
                        returnParams: { stationId }
                    });
                }}
                onClose={() => setLoginPromptVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 0,
        paddingVertical: 10,
    },
    center: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
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
