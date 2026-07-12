import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { UI_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@dahamkee/shared/constants';

export default function TextbookIngestScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [textbookTitle, setTextbookTitle] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleIngest = async () => {
    if (!selectedImage || !textbookTitle.trim()) return;
    
    setIsLoading(true);
    try {
      // TODO: Call rag-ingest Edge Function
      console.log('Ingesting textbook:', textbookTitle);
      alert('교과서 인제스트 완료 (구현 예정)');
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>< 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>교과서 등록</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>교과서 정보</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>교과서 제목</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 중학교 1학년 영어 교과서"
              value={textbookTitle}
              onChangeText={setTextbookTitle}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>교과서 이미지</Text>
          <Text style={styles.hint}>교과서 페이지를 촬영하거나 앨범에서 선택하세요.</Text>
          
          <View style={styles.imageArea}>
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setSelectedImage(null)}>
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>이미지를 선택해주세요</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionButton, styles.cameraButton]} onPress={takePhoto} disabled={isLoading}>
              <Text style={styles.actionButtonText}>📷 사진 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.galleryButton]} onPress={pickImage} disabled={isLoading}>
              <Text style={styles.actionButtonText}>🖼 앨범에서 선택</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} onPress={handleIngest} disabled={isLoading || !selectedImage || !textbookTitle.trim()}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>지식 베이스에 등록</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surface,
  },
  backButton: {
    paddingHorizontal: SPACING.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: UI_COLORS.primary,
    fontFamily: 'Nunito',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
    marginBottom: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Nunito',
  },
  input: {
    backgroundColor: UI_COLORS.background,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    fontFamily: 'Nunito',
    color: UI_COLORS.textPrimary,
  },
  hint: {
    fontSize: 13,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
    marginBottom: SPACING.md,
  },
  imageArea: {
    marginTop: SPACING.md,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BORDER_RADIUS,
    borderWidth: 2,
    borderColor: UI_COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_COLORS.background,
  },
  placeholderText: {
    fontSize: 14,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
  },
  selectedImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    backgroundColor: UI_COLORS.primary,
  },
  galleryButton: {
    backgroundColor: UI_COLORS.accent,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  submitButton: {
    backgroundColor: UI_COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    marginTop: SPACING.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
});