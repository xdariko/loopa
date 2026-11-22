class Project < ApplicationRecord
  belongs_to :user, optional: true
  FORMAT_VERSION = 1
  MAX_SAMPLE_SIZE = 5.megabytes
  SAMPLE_TYPES = {
    "audio/wav" => "audio/wav",
    "audio/x-wav" => "audio/wav",
    "audio/vnd.wave" => "audio/wav",
    "audio/mpeg" => "audio/mpeg"
  }.freeze

  has_secure_token :share_token
  has_many_attached :samples

  validates :title, presence: true
  validate :supported_document

  def add_sample(file)
    if !file.is_a?(ActionDispatch::Http::UploadedFile) || file.size.zero?
      errors.add(:samples, "must include an audio file")
      return
    end
    if file.size > MAX_SAMPLE_SIZE
      errors.add(:samples, "must be 5 MB or smaller")
      return
    end

    content_type = SAMPLE_TYPES[Marcel::MimeType.for(file.tempfile)]
    unless content_type
      errors.add(:samples, "must be WAV or MP3")
      return
    end

    file.rewind
    blob = ActiveStorage::Blob.create_and_upload!(
      io: file.tempfile, filename: file.original_filename, content_type: content_type, identify: false
    )
    samples_attachments.create!(blob: blob)
    blob
  rescue StandardError
    blob&.purge
    raise
  end

  private

  def supported_document
    if !data.is_a?(Hash)
      errors.add(:data, "must be a JSON object")
    elsif !FORMAT_VERSION.eql?(data["version"])
      errors.add(:data, "must have version #{FORMAT_VERSION}")
    end
  end
end
