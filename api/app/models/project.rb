class Project < ApplicationRecord
  FORMAT_VERSION = 1

  has_secure_token :share_token
  has_many_attached :samples

  validates :title, presence: true
  validate :supported_document

  private

  def supported_document
    if !data.is_a?(Hash)
      errors.add(:data, "must be a JSON object")
    elsif !FORMAT_VERSION.eql?(data["version"])
      errors.add(:data, "must have version #{FORMAT_VERSION}")
    end
  end
end
