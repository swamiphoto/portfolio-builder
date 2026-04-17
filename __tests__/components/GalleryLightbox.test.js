import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    push: mockPush,
    pathname: '/test',
  }),
}));

jest.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}));

// Mock child gallery components to expose click
jest.mock('../../components/image-displays/gallery/masonry-gallery/MasonryGallery', () => ({
  __esModule: true,
  default: ({ onImageClick }) => (
    <div data-testid="masonry">
      <button onClick={() => onImageClick && onImageClick(0)}>img0</button>
      <button onClick={() => onImageClick && onImageClick(1)}>img1</button>
    </div>
  ),
}));

jest.mock('../../components/image-displays/gallery/stacked-gallery/StackedGallery', () => ({
  __esModule: true,
  default: ({ onImageClick }) => (
    <div data-testid="stacked">
      <button onClick={() => onImageClick && onImageClick(0)}>simg0</button>
    </div>
  ),
}));

jest.mock('../../components/image-displays/gallery/photo-block/PhotoBlock', () => ({
  __esModule: true,
  default: ({ onImageClick }) => (
    <button data-testid="photoblock" onClick={() => onImageClick && onImageClick(0)}>photo</button>
  ),
}));

jest.mock('../../components/wiggle-line/WiggleLine', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/image-displays/gallery/gallery-cover/GalleryCover', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/image-displays/gallery/video-block/VideoBlock', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/image-displays/PhotoLightbox', () => ({
  __esModule: true,
  default: ({ index, images, onClose }) => (
    <div data-testid="lightbox">
      <span data-testid="lightbox-index">{index}</span>
      <span data-testid="lightbox-count">{images.length}</span>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const Gallery = require('../../components/image-displays/gallery/Gallery').default;

const blocks = [
  {
    type: 'masonry',
    images: [
      { assetId: 'a1', url: 'https://example.com/a.jpg', caption: 'Alpha' },
      { assetId: 'a2', url: 'https://example.com/b.jpg', caption: 'Beta' },
    ],
  },
  {
    type: 'photo',
    layout: 'Centered',
    image: { assetId: 'b1', url: 'https://example.com/c.jpg' },
    caption: 'Charlie',
  },
];

beforeEach(() => {
  mockPush.mockClear();
});

test('clicking first image in masonry block calls router.push with photo=0', () => {
  render(<Gallery name="Test" description="" blocks={blocks} />);
  fireEvent.click(screen.getByText('img0'));
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ photo: 0 }) }),
    undefined,
    { shallow: true }
  );
});

test('clicking second image in masonry block calls router.push with photo=1', () => {
  render(<Gallery name="Test" description="" blocks={blocks} />);
  fireEvent.click(screen.getByText('img1'));
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ photo: 1 }) }),
    undefined,
    { shallow: true }
  );
});

test('clicking photo block calls router.push with photo=2 (offset by masonry block count)', () => {
  render(<Gallery name="Test" description="" blocks={blocks} />);
  fireEvent.click(screen.getByTestId('photoblock'));
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ photo: 2 }) }),
    undefined,
    { shallow: true }
  );
});
