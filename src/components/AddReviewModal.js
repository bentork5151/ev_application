import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Dimensions, Animated } from 'react-native';
import StarRating from './StarRating';
import { X } from 'lucide-react-native';
import { reviewsApi } from '../services/api';

const { width } = Dimensions.get('window');

const AddReviewModal = ({ visible, onClose, stationId, existingReview, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const progress = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    const overlayStyle = {
        opacity: progress,
    };

    const cardStyle = {
        opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
        }),
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                }),
            },
            {
                scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                }),
            },
        ],
    };

    useEffect(() => {
        if (visible) {
            if (existingReview) {
                setRating(existingReview.rating || 0);
                const text = existingReview.review_text ||
                    existingReview.comment ||
                    existingReview.text ||
                    existingReview.description ||
                    '';
                setComment(text);
            } else {
                setRating(0);
                setComment('');
            }
            setError(null);
        }
    }, [visible, existingReview]);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please select a star rating");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const reviewData = {
                rating,
                ratingValue: rating,
                review_text: comment.trim(),
                comment: comment.trim(),
                reviewText: comment.trim(),
                description: comment.trim(),
                text: comment.trim(),
                stationId
            };

            let result;
            if (existingReview) {
                result = await reviewsApi.updateReview(existingReview.id, reviewData);
            } else {
                result = await reviewsApi.createReview(reviewData);
            }

            if (result) {
                onReviewSubmitted(result);
                onClose();
            }
        } catch (err) {
            console.error("Submission Failed:", err);
            setError(err.userMessage || "Failed to submit review. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.modalContainer, cardStyle]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{existingReview ? "Edit Review" : "Write a Review"}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.label}>Rate your experience</Text>
                        <View style={styles.starContainer}>
                            <StarRating
                                rating={rating}
                                size={32}
                                interactive={true}
                                onRatingChange={setRating}
                                style={{ gap: 8 }}
                            />
                        </View>

                        <Text style={styles.label}>Share your feedback (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tell us about your charging session..."
                            placeholderTextColor="#7E8E9F"
                            multiline
                            numberOfLines={4}
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{comment.length}/500</Text>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#1A1A1A" />
                            ) : (
                                <Text style={styles.submitBtnText}>{existingReview ? "Update Review" : "Submit Review"}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#E2E7EC',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        gap: 16,
    },
    label: {
        color: '#5A6B7C',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    starContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '800',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    charCount: {
        color: '#5A6B7C',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
        marginTop: -12,
        marginBottom: 12,
    },
    errorText: {
        color: '#EF5350',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
    },
    submitBtn: {
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#1A1A1A',
        fontWeight: '900',
        fontSize: 16,
    }
});

export default AddReviewModal;
