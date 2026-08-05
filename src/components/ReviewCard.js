import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import StarRating from './StarRating';
import { Colors } from '../styles/GlobalStyles';
import { userApi } from '../services/api';
import { authService } from '../services/auth';
import { MoreVertical, User, Edit2, Trash2 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';

const ReviewCard = ({ review, onEdit, onDelete, isOwnReview }) => {
    const { theme } = useTheme();
    const { showAlert } = useAlert();
    const [showOptions, setShowOptions] = useState(false);
    const [author, setAuthor] = useState({
        name: review.user?.name || 'Anonymous User',
        pic: review.user?.profilePic || null
    });

    useEffect(() => {
        const loadAuthor = async () => {
            const getUserImage = (u) => u?.imageUrl || u?.image_url || u?.profilePic || u?.profile_pic || null;
            const getUserName = (u) => u?.name || 'Anonymous User';

            // Priority 1: Use data already embedded in the review object (e.g. review.user)
            if (review.user && review.user.name) {
                setAuthor({
                    name: getUserName(review.user),
                    pic: getUserImage(review.user)
                });
                return;
            }

            // Priority 2: If it's my own review (the user logged in), show "Me" or my local profile name
            if (isOwnReview) {
                try {
                    const myProfile = await authService.getUser();
                    if (myProfile) {
                        setAuthor({
                            name: myProfile.name || 'Me',
                            pic: getUserImage(myProfile)
                        });
                        return;
                    }
                } catch (e) { }
            }

            // Priority 3: Fetch if data missing but userId exists
            if (review.userId) {
                try {
                    const userData = await userApi.getUserById(review.userId);
                    if (userData) {
                        setAuthor({
                            name: getUserName(userData),
                            pic: getUserImage(userData)
                        });
                        return;
                    }
                } catch (e) {
                    console.warn(`[ReviewCard] Failed to fetch user ${review.userId}:`, e.message);
                }
            }

            // Fallback
            setAuthor({
                name: 'Anonymous User',
                pic: null
            });
        };
        loadAuthor();
    }, [review, isOwnReview]);

    // Format Date: e.g. "2 days ago"
    const dateStr = review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : 'Recently';

    return (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.divider }]}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={[styles.avatar, { backgroundColor: theme.divider }]}>
                        {author.pic ? (
                            <Image source={{ uri: author.pic }} style={styles.avatarImg} />
                        ) : (
                            <User size={20} color={theme.textSecondary} />
                        )}
                    </View>
                    <View>
                        <Text style={[styles.userName, { color: theme.textPrimary }]}>{author.name}</Text>
                        <Text style={[styles.date, { color: theme.textSecondary }]}>{dateStr}</Text>
                    </View>
                </View>

                {isOwnReview && (
                    <TouchableOpacity onPress={() => setShowOptions(!showOptions)} style={styles.moreBtn}>
                        <MoreVertical size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Options Menu (Simple Toggle) */}
            {showOptions && isOwnReview && (
                <View style={[styles.optionsMenu, { backgroundColor: theme.white }]}>
                    <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptions(false); onEdit(review); }}>
                        <Edit2 size={16} color="#00B074" />
                        <Text style={[styles.optionText, { color: '#00B074' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.optionItem} onPress={() => {
                        setShowOptions(false);
                        showAlert("Delete Review", "Are you sure?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => onDelete(review.id) }
                        ]);
                    }}>
                        <Trash2 size={16} color="#EF5350" />
                        <Text style={[styles.optionText, { color: '#EF5350' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.ratingRow}>
                <StarRating rating={review.rating} size={14} />
            </View>

            {/* Render review text with fallback options */}
            {(review.comment || review.review_text || review.text || review.description) ? (
                <Text style={[styles.comment, { color: theme.textSecondary }]}>
                    {review.comment || review.review_text || review.text || review.description}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    date: {
        fontSize: 12,
    },
    moreBtn: {
        padding: 4,
    },
    ratingRow: {
        marginBottom: 8,
    },
    comment: {
        fontSize: 14,
        lineHeight: 20,
    },
    optionsMenu: {
        position: 'absolute',
        right: 10,
        top: 40,
        borderRadius: 8,
        padding: 8,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        minWidth: 120,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
    }
});

export default ReviewCard;
