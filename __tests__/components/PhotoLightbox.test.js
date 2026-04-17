import { render, screen, fireEvent } from '@testing-library/react';
import PhotoLightbox from '../../components/image-displays/PhotoLightbox';

const images = [
  { url: 'https://example.com/a.jpg', caption: 'Alpha' },
  { url: 'https://example.com/b.jpg', caption: 'Beta' },
  { url: 'https://example.com/c.jpg' },
];

test('renders current image and caption', () => {
  render(<PhotoLightbox images={images} index={0} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.getByRole('img').src).toContain('a.jpg');
  expect(screen.getByText('Alpha')).toBeInTheDocument();
});

test('shows prev/next buttons', () => {
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
  expect(screen.getByLabelText('Next image')).toBeInTheDocument();
});

test('hides prev button on first image', () => {
  render(<PhotoLightbox images={images} index={0} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.queryByLabelText('Previous image')).toBeNull();
});

test('hides next button on last image', () => {
  render(<PhotoLightbox images={images} index={2} onClose={jest.fn()} onNavigate={jest.fn()} />);
  expect(screen.queryByLabelText('Next image')).toBeNull();
});

test('calls onNavigate with correct index on prev click', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.click(screen.getByLabelText('Previous image'));
  expect(onNavigate).toHaveBeenCalledWith(0);
});

test('calls onNavigate with correct index on next click', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.click(screen.getByLabelText('Next image'));
  expect(onNavigate).toHaveBeenCalledWith(2);
});

test('calls onClose on X button click', () => {
  const onClose = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={jest.fn()} />);
  fireEvent.click(screen.getByLabelText('Close lightbox'));
  expect(onClose).toHaveBeenCalled();
});

test('calls onClose on backdrop click', () => {
  const onClose = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={jest.fn()} />);
  fireEvent.click(screen.getByTestId('lightbox-backdrop'));
  expect(onClose).toHaveBeenCalled();
});

test('calls onClose on Escape key', () => {
  const onClose = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={onClose} onNavigate={jest.fn()} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('calls onNavigate on ArrowRight key', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={0} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(onNavigate).toHaveBeenCalledWith(1);
});

test('calls onNavigate on ArrowLeft key', () => {
  const onNavigate = jest.fn();
  render(<PhotoLightbox images={images} index={1} onClose={jest.fn()} onNavigate={onNavigate} />);
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(onNavigate).toHaveBeenCalledWith(0);
});

test('does not show caption when image has none', () => {
  render(<PhotoLightbox images={images} index={2} onClose={jest.fn()} onNavigate={jest.fn()} />);
  // images[2] has no caption — no italic caption paragraph should appear
  expect(screen.queryByText('Alpha')).toBeNull();
  expect(screen.queryByText('Beta')).toBeNull();
});
