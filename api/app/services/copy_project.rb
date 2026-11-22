class CopyProject
  def self.call(source, user: nil)
    Project.transaction do
      copy = Project.new(title: source.title, data: source.data, user: user)
      copy.samples.attach(source.samples_attachments.map(&:blob))
      copy.save!
      copy
    end
  end
end
